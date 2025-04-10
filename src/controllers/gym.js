const geoTz = require('geo-tz')
const moment = require('moment-timezone')
require('moment-precise-range-plugin')

const Controller = require('./controller')

/**
 * Controller for processing gym webhooks
 * Alerts on Team change
 */
class Gym extends Controller {
	async gymWhoCares(data) {
		const { areastring, strictareastring } = this.buildAreaString(data.matched)

		let changeQuery = ''
		if (data.old_team_id === data.teamId) {
			changeQuery = 'and (1=0'
			if (data.old_slots_available !== data.slotsAvailable) {
				changeQuery += ' or gym.slot_changes = true'
			}
			if (data.inBattle) {
				changeQuery += ' or gym.battle_changes = true'
			}
			changeQuery += ')'
		}
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, gym.template, gym.distance, gym.clean, gym.ping from gym
		join humans on (humans.id = gym.id and humans.current_profile_no = gym.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%"gym"%') and
		(gym.team = ${data.teamId} or gym.team = 4)
		${changeQuery}
		${strictareastring}
		and
		((gym.gym_id='${data.gymId}' and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%specificgym%') ) or (gym.gym_id is NULL and `

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
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
			))
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
		const data = obj
		// const minTth = this.config.general.monsterMinimumTimeTillHidden || 0
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.id || data.gym_id

			Object.assign(data, this.config.general.dtsDictionary)
			data.gymId = data.id || data.gym_id
			data.googleMapUrl = `https://maps.google.com/maps?q=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/place?coordinate=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			if (this.config.general.rdmURL) {
				data.rdmUrl = `${this.config.general.rdmURL}${!this.config.general.rdmURL.endsWith('/') ? '/' : ''}@gym/${data.gymId}`
			}
			if (this.config.general.reactMapURL) {
				data.reactMapUrl = `${this.config.general.reactMapURL}${!this.config.general.reactMapURL.endsWith('/') ? '/' : ''}id/gyms/${data.gymId}`
			}
			if (this.config.general.rocketMadURL) {
				data.rocketMadUrl = `${this.config.general.rocketMadURL}${!this.config.general.rocketMadURL.endsWith('/') ? '/' : ''}?lat=${data.latitude}&lon=${data.longitude}&zoom=18.0`
			}
			if (data.gym_name) data.name = data.gym_name
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

			const conqueredTime = moment().tz(geoTz.find(data.latitude, data.longitude)[0].toString())
			data.conqueredTime = conqueredTime.format(this.config.locale.time)

			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				this.log.debug(`${data.id} Gym already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matchedAreas = this.pointInArea([data.latitude, data.longitude])
			data.matched = data.matchedAreas.map((x) => x.name.toLowerCase())

			data.teamId = data.team_id ?? data.team ?? 0
			data.oldTeamId = data.old_team_id ?? 0
			data.previousControlId = data.last_owner_id ?? 0
			data.teamNameEng = this.GameData.utilData.teams[data.teamId].name
			data.oldTeamNameEng = data.old_team_id >= 0 ? this.GameData.utilData.teams[data.old_team_id].name : ''
			data.previousControlNameEng = data.last_owner_id >= 0 ? this.GameData.utilData.teams[data.last_owner_id].name : ''
			data.gymColor = this.GameData.utilData.teams[data.teamId].color
			data.slotsAvailable = data.slots_available
			data.oldSlotsAvailable = data.old_slots_available
			data.trainerCount = 6 - data.slotsAvailable
			data.oldTrainerCount = 6 - data.oldSlotsAvailable
			data.ex = !!(data.ex_raid_eligible ?? data.is_ex_raid_eligible)
			data.color = data.gymColor
			data.inBattle = data.is_in_battle ?? data.in_battle

			const whoCares = data.poracleTest ? [{
				...data.poracleTest,
				clean: false,
				ping: '',
			}] : await this.gymWhoCares(data)

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

			setImmediate(async () => {
				try {
					if (this.imgUicons) data.imgUrl = await this.imgUicons.gymIcon(data.teamId, 6 - data.slotsAvailable, data.inBattle, data.ex) || this.config.fallbacks?.imgUrlGym
					if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.gymIcon(data.teamId, 6 - data.slotsAvailable, data.inBattle, data.ex)

					const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
					const jobs = []

					require('./common/nightTime').setNightTime(data, conqueredTime, this.config)

					await this.getStaticMapUrl(logReference, data, 'gym', ['teamId', 'latitude', 'longitude', 'imgUrl', 'style'])
					data.intersection = await this.obtainIntersection(data)

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
						data.previousControlTeamEmojiEng = data.previousControlId >= 0 ? this.emojiLookup.lookup(this.GameData.utilData.teams[data.previousControlId].emoji, platform) : ''
						data.previousControlTeamEmoji = translator.translate(data.previousControlTeamEmojiEng)

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
							areas: data.matchedAreas.filter((area) => area.displayInMatches).map((area) => area.name).join(', '),
						}

						const templateType = 'gym'
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
					this.log.error(`${data.id || data.gym_id}: Can't seem to handle gym (user cares): `, e, data)
				}
			})

			return []
		} catch (e) {
			this.log.error(`${data.id || data.gym_id}: Can't seem to handle gym: `, e, data)
		}
	}
}

module.exports = Gym
