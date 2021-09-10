// const geoTz = require('geo-tz')
// const moment = require('moment-timezone')
const Controller = require('./controller')

/**
 * Controller for processing gym webhooks
 * Alerts on lures
 */
class Gym extends Controller {
	async gymWhoCares(data) {
		let areastring = '1 = 0 '// `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let strictareastring = ''
		if (this.config.areaSecurity.enabled && this.config.areaSecurity.strictLocations) {
			strictareastring = 'and (humans.area_restriction IS NULL OR (1 = 0 '
			data.matched.forEach((area) => {
				strictareastring = strictareastring.concat(`or humans.area_restriction like '%"${area}"%' `)
			})
			strictareastring = strictareastring.concat('))')
		}
		let slotChangeQuery = ''
		if (data.old_team_id === data.teamId) {
			slotChangeQuery = 'and gym.slot_changes = true'
		}
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, gym.template, gym.distance, gym.clean, gym.ping from gym
		join humans on (humans.id = gym.id and humans.current_profile_no = gym.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and
		gym.team = ${data.teamId}
		${slotChangeQuery}
		and
		(gym.gym_id='${data.gymId}' `

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			or
			(
				(
					round(
						6371000
						* acos(cos( radians(${data.latitude}) )
						* cos( radians( humans.latitude ) )
						* cos( radians( humans.longitude ) - radians(${data.longitude}) )
						+ sin( radians(${data.latitude}) )
						* sin( radians( humans.latitude ) )
						)
					) < gym.distance and gym.distance != 0)
					or
					(
						gym.distance = 0 and (${areastring})
					)
			)
			)
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
		} else {
			query = query.concat(`
				or ((gym.distance = 0 and (${areastring})) or gym.distance > 0))
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
		}
		// this.log.silly(`${data.pokestop_id}: Query ${query}`)

		let result = await this.db.raw(query)
		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => res.distance === 0 || res.distance > 0 && res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
		}
		result = this.returnByDatabaseType(result)
		// remove any duplicates
		const alertIds = []
		result = result.filter((alert) => {
			if (!alertIds.includes(alert.id)) {
				alertIds.push(alert.id)
				return alert
			}
		})
		return result
	}

	async handle(obj) {
		let pregenerateTile = false
		const data = obj
		// const minTth = this.config.general.monsterMinimumTimeTillHidden || 0
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.id || data.gym_id
			switch (this.config.geocoding.staticProvider.toLowerCase()) {
				case 'tileservercache': {
					pregenerateTile = true
					break
				}
				case 'google': {
					data.staticMap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${this.config.geocoding.type}&zoom=${this.config.geocoding.zoom}&size=${this.config.geocoding.width}x${this.config.geocoding.height}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'osm': {
					data.staticMap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${this.config.geocoding.width},${this.config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${this.config.geocoding.zoom}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'mapbox': {
					data.staticMap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${this.config.geocoding.zoom},0,0/${this.config.geocoding.width}x${this.config.geocoding.height}?access_token=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				default: {
					data.staticMap = ''
				}
			}
			Object.assign(data, this.config.general.dtsDictionary)
			data.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			data.name = this.escapeJsonString(data.name)
			data.gymName = data.name
			data.gymUrl = data.url

			data.tth = {
				days: 0,
				hours: 1,
				minutes: 0,
				seconds: 0,
			}
			//			data.disappearTime = moment(lureExpiration * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.distime = data.disappearTime // deprecated

			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				this.log.debug(`${data.id} Gym already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matchedAreas = this.pointInArea([data.latitude, data.longitude])
			data.matched = data.matchedAreas.map((x) => x.name.toLowerCase())

			data.gymId = data.id || data.gym_id
			data.teamId = data.team_id !== undefined ? data.team_id : data.team
			data.oldTeamId = data.old_team_id >= 0 ? data.old_team_id : 0
			data.previousControlId = data.last_owner_id >= 0 ? data.last_owner_id : 0
			data.teamNameEng = data.teamId >= 0 ? this.GameData.utilData.teams[data.teamId].name : 'Unknown'
			data.oldTeamNameEng = data.old_team_id >= 0 ? this.GameData.utilData.teams[data.old_team_id].name : ''
			data.previousControlNameEng = data.last_owner_id >= 0 ? this.GameData.utilData.teams[data.last_owner_id].name : ''
			data.gymColor = data.team_id >= 0 ? this.GameData.utilData.teams[data.team_id].color : 'BABABA'
			data.slotsAvailable = data.slots_available
			data.oldSlotsAvailable = data.old_slots_available
			data.ex = !!(data.ex_raid_eligible || data.is_ex_raid_eligible)
			data.color = data.gymColor

			const whoCares = await this.gymWhoCares(data)

			if (whoCares.length) {
				this.log.info(`${logReference}: Gym ${data.name} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Gym ${data.name} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			}

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating gym alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
				})

				return []
			}

			data.imgUrl = await this.imgUicons.gymIcon(data.teamId, data.slotsAvailable, false, data.ex)
			data.stickerUrl = await this.stickerUicons.gymIcon(data.teamId, data.slotsAvailable, false, data.ex)

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile && this.config.geocoding.staticMapType.gym) {
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'gym', data, this.config.geocoding.staticMapType.gym)
			}
			data.staticmap = data.staticMap // deprecated

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating gym alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating gym alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating gym alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)
				let [platform] = cares.type.split(':')
				if (platform === 'webhook') platform = 'discord'

				data.teamName = translator.translate(data.teamNameEng)
				data.oldTeamName = translator.translate(data.oldTeamNameEng)
				data.previousControlName = translator.translate(data.previousControlNameEng)
				data.teamEmojiEng = data.teamId >= 0 ? this.emojiLookup.lookup(this.GameData.utilData.teams[data.teamId].emoji, platform) : ''
				data.teamEmoji = translator.translate(data.teamEmojiEng)

				// full build

				const view = {
					...geoResult,
					...data,
					time: data.distime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					now: new Date(),
					nowISO: new Date().toISOString(),
					areas: data.matchedAreas.filter((area) => area.displayInMatches).map((area) => area.name.replace(/'/gi, '')).join(', '),
				}

				const templateType = 'gym'
				const mustache = this.getDts(logReference, templateType, platform, cares.template, language)
				let message
				if (mustache) {
					let mustacheResult
					try {
						mustacheResult = mustache(view, { data: { language, platform } })
					} catch (err) {
						this.log.error(`${logReference}: Error generating mustache results for ${platform}/${cares.template}/${language}`, err, view)
					}
					if (mustacheResult) {
						mustacheResult = await this.urlShorten(mustacheResult)
						try {
							message = JSON.parse(mustacheResult)
							if (cares.ping) {
								if (!message.content) {
									message.content = cares.ping
								} else {
									message.content += cares.ping
								}
							}
						} catch (err) {
							this.log.error(`${logReference}: Error JSON parsing mustache results ${mustacheResult}`, err)
						}
					}
				}

				if (!message) {
					message = { content: `*Poracle*: An alert was triggered with invalid or missing message template - ref: ${logReference}\nid: '${cares.template}' type: '${templateType}' platform: '${platform}' language: '${language}'` }
				}

				const work = {
					lat: data.latitude.toString().substring(0, 8),
					lon: data.longitude.toString().substring(0, 8),
					message,
					target: cares.id,
					type: cares.type,
					name: cares.name,
					tth: data.tth,
					clean: cares.clean,
					emoji: data.emoji,
					logReference,
					language,
				}

				jobs.push(work)
			}

			return jobs
		} catch (e) {
			this.log.error(`${data.id || data.gym_id}: Can't seem to handle gym: `, e, data)
		}
	}
}

module.exports = Gym
