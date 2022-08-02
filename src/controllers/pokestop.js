const geoTz = require('geo-tz')
const moment = require('moment-timezone')
require('moment-precise-range-plugin')

const Controller = require('./controller')

class Invasion extends Controller {
	async invasionWhoCares(obj) {
		const data = obj
		const { areastring, strictareastring } = this.buildAreaString(data.matched)

		if (!data.gender) data.gender = -1
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping from invasion
		join humans on (humans.id = invasion.id and humans.current_profile_no = invasion.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%invasion%') and
		(invasion.grunt_type='${String(data.gruntType).toLowerCase()}' or invasion.grunt_type = 'everything') and
		(invasion.gender = ${data.gender} or invasion.gender = 0)
		${strictareastring}
		`

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
		const data = obj
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.pokestop_id

			Object.assign(data, this.config.general.dtsDictionary)
			data.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			if (this.config.general.reactMapURL) {
				data.reactMapUrl = `${this.config.general.reactMapURL}${!this.config.general.reactMapURL.endsWith('/') ? '/' : ''}id/pokestops/${data.pokestop_id}`
			}
			if (this.config.general.rocketMadURL) {
				data.rocketMadUrl = `${this.config.general.rocketMadURL}${!this.config.general.rocketMadURL.endsWith('/') ? '/' : ''}?lat=${data.latitude}&lon=${data.longitude}&zoom=18.0`
			}
			data.name = data.name ? this.escapeJsonString(data.name) : this.escapeJsonString(data.pokestop_name)
			data.pokestopName = data.name
			data.pokestopUrl = data.url

			const incidentExpiration = data.incident_expiration ?? data.incident_expire_timestamp
			data.tth = moment.preciseDiff(Date.now(), incidentExpiration * 1000, true)
			const disappearTime = moment(incidentExpiration * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString())
			data.disappearTime = disappearTime.format(this.config.locale.time)
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.distime = data.disappearTime // deprecated

			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				this.log.debug(`${data.pokestop_id} Invasion already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matchedAreas = this.pointInArea([data.latitude, data.longitude])
			data.matched = data.matchedAreas.map((x) => x.name.toLowerCase())

			data.gruntTypeId = 0
			if (data.incident_grunt_type) {
				data.gruntTypeId = data.incident_grunt_type
			} else if (data.grunt_type) {
				data.gruntTypeId = data.grunt_type
			}

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
					data.gruntName = (gruntType.type !== gruntType.name) ? `${gruntType.type} ${gruntType.grunt}` : gruntType.name
					data.gender = gruntType.gender
					data.gruntType = gruntType.type
				}
			}

			const whoCares = data.poracleTest ? [{
				...data.poracleTest,
				clean: false,
				ping: '',
			}] : await this.invasionWhoCares(data)

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

			setImmediate(async () => {
				try {
					if (this.imgUicons) data.imgUrl = await this.imgUicons.invasionIcon(data.gruntTypeId)
					if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.invasionIcon(data.gruntTypeId)
					if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.invasionIcon(data.gruntTypeId)

					const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
					const jobs = []

					require('./common/nightTime').setNightTime(data, disappearTime)

					// Get current cell weather from cache
					const weatherCellId = this.weatherData.getWeatherCellId(data.latitude, data.longitude)
					const currentCellWeather = this.weatherData.getCurrentWeatherInCell(weatherCellId)

					await this.getStaticMapUrl(logReference, data, 'pokestop', ['latitude', 'longitude', 'imgUrl', 'gruntTypeId'])
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
						let [platform] = cares.type.split(':')
						if (platform === 'webhook') platform = 'discord'

						data.gruntTypeEmoji = translator.translate(this.emojiLookup.lookup('grunt-unknown', platform))
						require('./common/weather').setGameWeather(data, translator, this.GameData, this.emojiLookup, platform, currentCellWeather)

						// full build
						if (data.gruntTypeId) {
							data.gender = 0
							data.gruntName = translator.translate('Grunt')
							data.gruntType = translator.translate('Mixed')
							data.gruntRewards = ''
							if (data.gruntTypeId in this.GameData.grunts) {
								const gruntType = this.GameData.grunts[data.gruntTypeId]
								data.gruntName = translator.translate(`${gruntType.type} ${gruntType.grunt}`)
								data.gender = gruntType.gender
								data.genderDataEng = this.GameData.utilData.genders[data.gender]
								if (!data.genderDataEng) {
									data.genderDataEng = { name: '', emoji: '' }
								}
								if (this.GameData.utilData.types[gruntType.type]) {
									data.gruntTypeEmoji = translator.translate(this.emojiLookup.lookup(this.GameData.utilData.types[gruntType.type].emoji, platform))
								}
								if (gruntType.type in this.GameData.utilData.types) {
									data.gruntTypeColor = this.GameData.utilData.types[gruntType.type].color
								}
								data.gruntType = translator.translate(gruntType.type)

								let gruntRewards = ''
								const gruntRewardsList = {}
								gruntRewardsList.first = { chance: 100, monsters: [] }
								if (gruntType.encounters && gruntType.encounters.first) {
									if (gruntType.secondReward && gruntType.encounters.second) {
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
											gruntRewardsList.first.monsters.push({
												id: firstReward,
												name: translator.translate(firstRewardMonster.name),
											})
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
											gruntRewardsList.second.monsters.push({
												id: secondReward,
												name: translator.translate(secondRewardMonster.name),
											})
										})
									} else {
										// Single Reward 100% of encounter (might vary based on actual fight).
										// && Giovanni or other third reward rockets
										let first = true
										gruntType.encounters[gruntType.thirdReward ? 'third' : 'first'].forEach((tr) => {
											if (!first) gruntRewards += ', '
											else first = false

											const reward = +tr
											const rewardMonster = Object.values(this.GameData.monsters).find((mon) => mon.id === reward && !mon.form.id)
											gruntRewards += rewardMonster ? translator.translate(rewardMonster.name) : ''
											gruntRewardsList.first.monsters.push({
												id: reward,
												name: translator.translate(rewardMonster.name),
											})
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
							nowISO: new Date().toISOString(),
							genderData: data.genderDataEng ? {
								name: translator.translate(data.genderDataEng.name),
								emoji: translator.translate(this.emojiLookup.lookup(data.genderDataEng.emoji, platform)),
							} : { name: '', emoji: '' },
							areas: data.matchedAreas.filter((area) => area.displayInMatches).map((area) => area.name).join(', '),
						}

						const templateType = 'invasion'
						const message = await this.createMessage(logReference, templateType, platform, cares.template, language, cares.ping, view)

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
					this.emit('postMessage', jobs)
				} catch (e) {
					this.log.error(`${data.pokestop_id}: Can't seem to handle pokestop (user cares): `, e, data)
				}
			})

			return []
		} catch (e) {
			this.log.error(`${data.pokestop_id}: Can't seem to handle pokestop: `, e, data)
		}
	}
}

module.exports = Invasion
