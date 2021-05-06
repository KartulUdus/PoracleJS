const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')

class Pokestop extends Controller {
	async invasionWhoCares(obj) {
		const data = obj
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		if (!data.gender) data.gender = -1
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping from invasion
		join humans on (humans.id = invasion.id and humans.current_profile_no = invasion.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and
		(invasion.grunt_type='${String(data.gruntType).toLowerCase()}' or invasion.grunt_type = 'everything') and
		(invasion.gender = ${data.gender} or invasion.gender = 0)`

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			and
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
					) < invasion.distance and invasion.distance != 0)
					or
					(
						invasion.distance = 0 and (${areastring})
					)
			)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
			`)
		} else {
			query = query.concat(`
				and ((invasion.distance = 0 and (${areastring})) or invasion.distance > 0)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
			`)
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
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.pokestop_id
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

			data.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			data.name = this.escapeJsonString(data.name)
			data.pokestopName = data.name
			data.pokestopUrl = data.url

			const incidentExpiration = data.incident_expiration ? data.incident_expiration : data.incident_expire_timestamp
			data.tth = moment.preciseDiff(Date.now(), incidentExpiration * 1000, true)
			data.disappearTime = moment(incidentExpiration * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.imgUrl = data.pokestopUrl // deprecated
			data.distime = data.disappearTime // deprecated

			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				this.log.debug(`${data.pokestop_id} Invasion already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matched = this.pointInArea([data.latitude, data.longitude])

			data.gruntTypeId = 0
			if (data.incident_grunt_type) {
				data.gruntTypeId = data.incident_grunt_type
			} else if (data.grunt_type) {
				data.gruntTypeId = data.grunt_type
			}

			data.gruntTypeEmoji = '❓'
			data.gruntTypeColor = 'BABABA'

			data.gender = 0
			data.gruntName = ''
			data.gruntTypeColor = 'BABABA'
			data.gruntRewards = ''
			data.gruntRewardsList = {}

			// Only enough to match for query

			if (data.gruntTypeId) {
				data.gender = 0
				data.gruntName = 'Grunt'
				data.gruntType = 'Mixed'
				data.gruntRewards = ''
				if (data.gruntTypeId in this.GameData.grunts) {
					const gruntType = this.GameData.grunts[data.gruntTypeId]
					data.gruntName = gruntType.grunt
					data.gender = gruntType.gender
					data.gruntType = gruntType.type
				}
			}

			const whoCares = await this.invasionWhoCares(data)

			if (whoCares.length) {
				this.log.info(`${logReference}: Invasion of type ${data.gruntType} at ${data.pokestopName} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Invasion of type ${data.gruntType} at ${data.pokestopName} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			}

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating invasion alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
				})

				return []
			}

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile && this.config.geocoding.staticMapType.pokestop) {
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'pokestop', data, this.config.geocoding.staticMapType.pokestop)
			}
			data.staticmap = data.staticMap // deprecated

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating invasion alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating invasion alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating invasion alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				// full build
				if (data.gruntTypeId) {
					data.gender = 0
					data.gruntName = translator.translate('Grunt')
					data.gruntType = translator.translate('Mixed')
					data.gruntRewards = ''
					if (data.gruntTypeId in this.GameData.grunts) {
						const gruntType = this.GameData.grunts[data.gruntTypeId]
						data.gruntName = translator.translate(gruntType.grunt)
						data.gender = gruntType.gender
						data.genderDataEng = this.GameData.utilData.genders[data.gender]
						if (!data.genderDataEng) {
							data.genderDataEng = { name: '', emoji: '' }
						}
						if (this.GameData.utilData.types[gruntType.type]) {
							data.gruntTypeEmoji = translator.translate(this.GameData.utilData.types[gruntType.type].emoji)
						}
						if (gruntType.type in this.GameData.utilData.types) {
							data.gruntTypeColor = this.GameData.utilData.types[gruntType.type].color
						}
						data.gruntType = translator.translate(gruntType.type)

						let gruntRewards = ''
						const gruntRewardsList = {}
						gruntRewardsList.first = { chance: 100, monsters: [] }
						if (gruntType.encounters) {
							if (gruntType.second_reward && gruntType.encounters.second) {
								// one out of two rewards
								gruntRewards = '85%: '
								gruntRewardsList.first = { chance: 85, monsters: [] }
								let first = true
								gruntType.encounters.first.forEach((fr) => {
									if (!first) gruntRewards += ', '
									else first = false

									const firstReward = +fr
									const firstRewardMonster = Object.values(this.GameData.monsters).find((mon) => mon.id === firstReward && !mon.form.id)
									gruntRewards += firstRewardMonster ? translator.translate(firstRewardMonster.name) : ''
									gruntRewardsList.first.monsters.push({ id: firstReward, name: translator.translate(firstRewardMonster.name) })
								})
								gruntRewards += '\\n15%: '
								gruntRewardsList.second = { chance: 15, monsters: [] }
								first = true
								gruntType.encounters.second.forEach((sr) => {
									if (!first) gruntRewards += ', '
									else first = false

									const secondReward = +sr
									const secondRewardMonster = Object.values(this.GameData.monsters).find((mon) => mon.id === secondReward && !mon.form.id)

									gruntRewards += secondRewardMonster ? translator.translate(secondRewardMonster.name) : ''
									gruntRewardsList.second.monsters.push({ id: secondReward, name: translator.translate(secondRewardMonster.name) })
								})
							} else {
								// Single Reward 100% of encounter (might vary based on actual fight).
								let first = true
								gruntType.encounters.first.forEach((fr) => {
									if (!first) gruntRewards += ', '
									else first = false

									const firstReward = +fr
									const firstRewardMonster = Object.values(this.GameData.monsters).find((mon) => mon.id === firstReward && !mon.form.id)
									gruntRewards += firstRewardMonster ? translator.translate(firstRewardMonster.name) : ''
									gruntRewardsList.first.monsters.push({ id: firstReward, name: translator.translate(firstRewardMonster.name) })
								})
							}
							data.gruntRewards = gruntRewards
							data.gruntRewardsList = gruntRewardsList
						}
					}
				}

				const view = {
					...geoResult,
					...data,
					time: data.distime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					now: new Date(),
					genderData: data.genderDataEng ? { name: translator.translate(data.genderDataEng.name), emoji: translator.translate(data.genderDataEng.emoji) } : { name: '', emoji: '' },
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}

				let [platform] = cares.type.split(':')
				if (platform === 'webhook') platform = 'discord'

				const mustache = this.getDts(logReference, 'invasion', platform, cares.template, language)
				if (mustache) {
					let mustacheResult
					let message
					try {
						mustacheResult = mustache(view, { data: { language } })
					} catch (err) {
						this.log.error(`${logReference}: Error generating mustache results for ${platform}/${cares.template}/${language}`, err, view)
						// eslint-disable-next-line no-continue
						continue
					}
					mustacheResult = await this.urlShorten(mustacheResult)
					try {
						message = JSON.parse(mustacheResult)
					} catch (err) {
						this.log.error(`${logReference}: Error JSON parsing mustache results ${mustacheResult}`, err)
						// eslint-disable-next-line no-continue
						continue
					}

					if (cares.ping) {
						if (!message.content) {
							message.content = cares.ping
						} else {
							message.content += cares.ping
						}
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
			}

			return jobs
		} catch (e) {
			this.log.error(`${data.pokestop_id}: Can't seem to handle pokestop: `, e, data)
		}
	}
}

module.exports = Pokestop
