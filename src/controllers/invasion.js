const config = require('config')
const path = require('path')

const _ = require('lodash')
const mustache = require('mustache')

const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const log = require('../logger')
const Controller = require('./controller')

require('moment-precise-range-plugin')

moment.locale(config.locale.timeformat)
const minTth = config.general.monsterMinimumTimeTillHidden || 0

let gruntTypeDataPath = path.join(__dirname, '../util/grunt_types.json')
// Check if the config language is one of the array object (array for future translation possibilities)
if (_.includes(['de', 'fr'], config.locale.language.toLowerCase())) {
	gruntTypeDataPath = path.join(__dirname, `../util/locale/grunt_types${config.locale.language.toLowerCase()}.json`)
}

let monsterDataPath = path.join(__dirname, '../util/monsters.json')
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = path.join(__dirname, `../util/locale/monsters${config.locale.language.toLowerCase()}.json`)
}

const dts = require('../../config/dts')
const emojiData = require('../../config/emoji')

const gruntTypes = require(gruntTypeDataPath)

const monsterData = require(monsterDataPath)
const types = require('../util/types')
const genderData = require('../util/genders')

class Incident extends Controller {

	/*
* invasionWhoCares, takes data object
*/
	async invasionWhoCares(data) {
		return new Promise((resolve) => {
			let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
			})
			if (!data.gender) data.gender = '-1'

			const query = `
			select humans.id, humans.name, incident.template from incident
            join humans on humans.id = incident.id
			where humans.enabled = 1 and
			(incident.gruntType='' or incident.gruntType='${data.gruntType}') and
			(incident.gender = ${data.gender} or incident.gender = 0) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) )
              * cos( radians( humans.latitude ) )
              * cos( radians( humans.longitude ) - radians(${data.longitude}) )
              + sin( radians(${data.latitude}) )
              * sin( radians( humans.latitude ) ) ) < incident.distance and incident.distance != 0) or
			  incident.distance = 0 and (${areastring}))
               group by humans.id, humans.name, incident.template`
			log.log({ level: 'debug', message: 'invasionWhoCares query', event: 'sql:invasionWhoCares' })
			this.db.query(query)
				.then((result) => {
					log.info(`Invasion on ${data.name} appeared and ${result[0].length} humans cared`)
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`invasionWhoCares errored with: ${err}`)
				})
		})
	}

	async handle(data) {
		return new Promise((resolve) => {
			switch (config.geocoding.staticProvider.toLowerCase()) {
				case 'google': {
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.geocoding.type}&zoom=${config.geocoding.zoom}&size=${config.geocoding.width}x${config.geocoding.height}&key=${_.sample(config.geocoding.staticKey)}`
					break
				}
				case 'osm': {
					data.staticmap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${config.geocoding.width},${config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${config.geocoding.zoom}&key=${_.sample(config.geocoding.staticKey)}`
					break
				}
				case 'mapbox': {
					data.staticmap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${config.geocoding.zoom},0,0/${config.geocoding.width}x${config.geocoding.height}?access_token=${_.sample(config.geocoding.staticKey)}`
					break
				}
				default: {
					data.staticmap = ''
				}
			}

			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`

			const incidentExpiration = data.incident_expiration ? data.incident_expiration : data.incident_expire_timestamp
			data.tth = moment.preciseDiff(Date.now(), incidentExpiration * 1000, true)
			data.distime = moment(incidentExpiration * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(config.locale.time)

			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.warn(`${data.name} Invasion already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				resolve([])
				return null
			}

			this.pointInArea([data.latitude, data.longitude])
				.then((matchedAreas) => {
					data.matched = matchedAreas
					log.log({
						level: 'debug', message: `webhook message ${data.messageId} processing`, event: 'message:start', type: 'invasion', meta: data,
					})

					data.gruntTypeId = 0
					if (data.incident_grunt_type) {
						data.gruntTypeId = data.incident_grunt_type
					}
					else if (data.grunt_type) {
						data.gruntTypeId = data.grunt_type
					}
					data.gruntTypeEmoji = '❓'
					data.gruntTypeColor = '12595240'
					if (data.gruntTypeId) {
						if (data.gruntTypeId in gruntTypes) {
							const gruntType = gruntTypes[data.gruntTypeId]
							data.gruntName = gruntType.grunt
							data.gender = gruntType.gender
							if (gruntType.type in emojiData.type) {
								data.gruntTypeEmoji = emojiData.type[gruntType.type]
							}
							if (gruntType.type in types) {
								data.gruntTypeColor = types[gruntType.type].color
							}
							data.gruntType = gruntType.type

							let gruntRewards = ''
							if (gruntType.encounters) {
								if (gruntType.second_reward) {
									// one out of two rewards
									gruntRewards = '85%: '
									let first = true
									gruntType.encounters.first.forEach((fr) => {
										if (!first) gruntRewards += ', '
										else first = false

										const firstReward = parseInt(fr, 10)
										gruntRewards += monsterData[`${firstReward}`].name
									})
									gruntRewards += '\\n15%: '
									first = true
									gruntType.encounters.second.forEach((sr) => {
										if (!first) gruntRewards += ', '
										else first = false

										const secondReward = parseInt(sr, 10)
										gruntRewards += monsterData[`${secondReward}`].name
									})
								}
								else {
									// Single Reward 100% of encounter (might vary based on actual fight).
									let first = true
									gruntType.encounters.first.forEach((fr) => {
										if (!first) gruntRewards += ', '
										else first = false

										const firstReward = parseInt(fr, 10)
										gruntRewards += monsterData[`${firstReward}`].name
									})
								}

								data.gruntRewards = gruntRewards
							}
						}
						else {
							data.gender = 0
							data.gruntName = 'Grunt'
							data.gruntType = 'Mixed'
							data.gruntRewards = ''
						}
					}
					else {
						data.gender = 0
						data.gruntName = ''
						data.gruntTypeColor = '12595240'
						data.gruntRewards = ''
					}

					this.invasionWhoCares(data).then((whoCares) => {
						if (!whoCares[0]) {
							resolve([])
							return null
						}
						let discordCacheBad = true // assume the worst
						whoCares.forEach((cares) => {
							const ch = this.getDiscordCache(cares.id)
							if (ch <= config.discord.limitamount + 1) discordCacheBad = false // but if anyone cares and has not exceeded cache, go on
						})
						if (discordCacheBad) {
							resolve([])
							return null
						}
						this.getAddress({ lat: data.latitude, lon: data.longitude }).then((geoResult) => {
							const jobs = []


							whoCares.forEach((cares) => {
								const alarmId = this.uuid
								log.log({
									level: 'debug', message: `alarm ${alarmId} processing`, event: 'alarm:start', correlationId: data.correlationId, messageId: data.messageId, alarmId,
								})
								const caresCache = _.cloneDeep(this.getDiscordCache(cares.id))
								const view = _.extend(data, {
									id: data.pokestop_id,
									time: data.distime,
									tthh: data.tth.hours,
									tthm: data.tth.minutes,
									tths: data.tth.seconds,
									name: data.name,
									gendername: emojiData.gender && emojiData.gender[data.gender] ? emojiData.gender[data.gender] : genderData[data.gender],
									now: new Date(),
									staticmap: data.staticmap,
									imgurl: data.url,
									mapurl: data.mapurl,
									// geocode stuff
									lat: data.latitude.toString().substring(0, 8),
									lon: data.longitude.toString().substring(0, 8),
									addr: geoResult.addr,
									streetNumber: geoResult.streetNumber,
									streetName: geoResult.streetName,
									zipcode: geoResult.zipcode,
									country: geoResult.country,
									countryCode: geoResult.countryCode,
									city: geoResult.city,
									state: geoResult.state,
									stateCode: geoResult.stateCode,
									neighbourhood: geoResult.neighbourhood,
									flagemoji: geoResult.flag,
									areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
								})

								const template = JSON.stringify(dts.incident[`${cares.template}`])
								let message = mustache.render(template, view)
								message = JSON.parse(message)

								const work = {
									lat: data.latitude.toString().substring(0, 8),
									lon: data.longitude.toString().substring(0, 8),
									message: caresCache === config.discord.limitamount + 1 ? { content: `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds` } : message,
									target: cares.id,
									name: cares.name,
									emoji: caresCache === config.discord.limitamount + 1 ? [] : data.emoji,
									meta: { correlationId: data.correlationId, messageId: data.messageId, alarmId },
								}
								if (caresCache <= config.discord.limitamount + 1) {
									jobs.push(work)
									this.addDiscordCache(cares.id)
								}

							})
							resolve(jobs)
						}).catch((err) => {
							log.log({ level: 'error', message: `invasion getAddress errored with: ${err.message}`, event: 'fail:getAddress' })
						})

					}).catch((err) => {
						log.log({ level: 'error', message: `invasionWhoCares errored with: ${err.message}`, event: 'fail:invasionWhoCares' })
					})
				}).catch((err) => {
					log.log({ level: 'error', message: `pointsInArea of invasion errored with: ${err.message}`, event: 'fail:invasionPointsInArea' })
				})
		})
	}

}

module.exports = Incident
