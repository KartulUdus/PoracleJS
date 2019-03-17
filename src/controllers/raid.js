const Controller = require('./controller')
const config = require('config')
const log = require('../logger')
const pokemonGif = require('pokemon-gif')

const _ = require('lodash')
const mustache = require('mustache')

let monsterDataPath = `${__dirname}/../util/monsters.json`
let moveDataPath = `${__dirname}/../util/moves.json`
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = `${__dirname}/../../../util/locale/monsters${config.locale.language.toLowerCase()}.json`
	moveDataPath = `${__dirname}/../../../util/locale/moves${config.locale.language.toLowerCase()}.json`
}

const emojiData = require('../../config/emoji')

const monsterData = require(monsterDataPath)
const teamData = require('../util/teams')
const types = require('../util/types')

const moveData = require(moveDataPath)
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
require('moment-precise-range-plugin')

moment.locale(config.locale.timeformat)

const dts = require('../../config/dts')

class Raid extends Controller {

/*
* raidWhoCares, takes data object
*/
	async raidWhoCares(data) {
		return new Promise((resolve) => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `)
			})
			const query = `
			select humans.id, humans.name, raid.template from raid 
            join humans on humans.id = raid.id
            where humans.enabled = 1 and
            (pokemon_id=${data.pokemon_id} or (pokemon_id=721 and raid.level=${data.level})) and 
            (raid.team = ${data.team_id} or raid.team = 4) and 
            (raid.park = ${!!data.park} or raid.park = 0) and
			(raid.form = ${data.form} or raid.form = 0) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < raid.distance and raid.distance != 0) or
               raid.distance = 0 and (${areastring}))
               group by humans.id, humans.name, raid.template`

			log.log({ level: 'debug', message: 'raidWhoCares query', event: 'sql:raidWhoCares' })
			this.db.query(query)
				.then((result) => {
					log.info(`Raid against ${data.name} appeared and ${result[0].length} humans cared`)
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`raidWhoCares errored with: ${err}`)
				})
		})
	}

	async eggWhoCares(data) {
		return new Promise((resolve) => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `)
			})
			const query = `
			select humans.id, humans.name, egg.template from egg 
            join humans on humans.id = egg.id
            where humans.enabled = 1 and 
            (egg.park = ${!!data.park} or egg.park = 0) and
            raid_level = ${data.level} and 
            (egg.team = ${data.team_id} or egg.team = 4) and 
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < egg.distance and egg.distance != 0) or
               egg.distance = 0 and (${areastring}))
			group by humans.id, humans.name, egg.template`

			log.log({ level: 'debug', message: 'eggWhoCares query', event: 'sql:eggWhoCares' })
			this.db.query(query)
				.then((result) => {
					log.info(`Raid egg level ${data.level} appeared and ${result[0].length} humans cared`)
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`eggWhoCares errored with: ${err}`)
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

			// If there's a pokemon_id in the raid hook, we assume it's hatched
			if (data.pokemon_id) {

				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
				data.tth = moment.preciseDiff(Date.now(), data.end * 1000, true)
				data.distime = moment(data.end * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(config.locale.time)
				data.name = monsterData[data.pokemon_id] ? monsterData[data.pokemon_id].name : 'errormon'
				data.imgurl = `${config.general.imgurl}pokemon_icon_${(data.pokemon_id).toString().padStart(3, '0')}_00.png`
				const e = []
				monsterData[data.pokemon_id].types.forEach((type) => {
					if (types[type]) e.push(emojiData.type[type])
				})
				data.emoji = e
				data.emojiString = e.join('')
				if (!data.team_id) data.team_id = 0
				if (!data.form) data.form = 0
				data.teamname = data.team_id ? teamData[data.team_id].name : 'Harmony'
				data.color = data.team_id ? teamData[data.team_id].color : 7915600

				data.quick_move = moveData[data.move_1] ? moveData[data.move_1].name : ''
				data.charge_move = moveData[data.move_2] ? moveData[data.move_2].name : ''
				this.selectOneQuery('gym-info', 'id', data.gym_id)
					.then((gymInfo) => {
						data.gymname = gymInfo ? gymInfo.gym_name : data.gym_name
						data.description = gymInfo ? gymInfo.description : ''
						data.url = gymInfo ? gymInfo.url : ''
						data.park = gymInfo ? gymInfo.park : data.ex_raid_eligible
						data.park = data.ex_raid_eligible ? data.ex_raid_eligible : data.park
						data.ex = data.park ? 'EX' : ''
						if (data.tth.firstDateWasLater) {
							log.warn(`Raid against ${data.name} was sent but already ended`)
							resolve([])
						}
						this.pointInArea([data.latitude, data.longitude])
							.then((matchedAreas) => {
								data.matched = matchedAreas
								log.log({
									level: 'debug', message: `webhook message ${data.messageId} processing`, event: 'message:start', type: 'raid', meta: data,
								})

								this.raidWhoCares(data).then((whoCares) => {
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
											const view = {
												id: data.pokemon_id,
												time: data.distime,
												tthh: data.tth.hours,
												tthm: data.tth.minutes,
												tths: data.tth.seconds,
												name: data.name,
												now: new Date(),
												cp: data.cp,
												mincp20: this.getCp(data.pokemon_id, 20, 10, 10, 10),
												cp20: this.getCp(data.pokemon_id, 20, 15, 15, 15),
												mincp25: this.getCp(data.pokemon_id, 25, 10, 10, 10),
												cp25: this.getCp(data.pokemon_id, 25, 15, 15, 15),
												gymname: data.gymname,
												teamname: data.teamname,
												description: data.description,
												move1: data.quick_move,
												move2: data.charge_move,
												level: data.level,
												ex: data.ex,
												staticmap: data.staticmap,
												detailsurl: data.url,
												mapurl: data.mapurl,
												applemap: data.applemap,
												rocketmap: data.rocketmap,
												imgurl: data.imgurl.toLowerCase(),
												gif: pokemonGif(Number(data.pokemon_id)),
												color: data.color,
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
												emojistring: data.emojistring,
												pokemoji: emojiData.pokemon[data.pokemon_id],
												areas: data.matched.join(', '),

											}

											const template = JSON.stringify(dts.raid[`${cares.template}`])
											let message = mustache.render(template, view)
											message = JSON.parse(message)

											const work = {
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
										log.log({ level: 'error', message: `getAddress errored with: ${err.message}`, event: 'fail:getAddress' })
									})

								}).catch((err) => {
									log.log({ level: 'error', message: `raidWhoCares errored with: ${err.message}`, event: 'fail:monsterWhoCares' })
								})
							}).catch((err) => {
								log.log({ level: 'error', message: `pointsInArea errored with: ${err.message}`, event: 'fail:pointsInArea' })
							})
					}).catch((err) => {
						log.log({ level: 'error', message: `get gym-info errored with: ${err.message}`, event: 'fail:pointsInArea' })
					})
			}
			else {
				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
				data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true)
				data.hatchtime = moment(data.start * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(config.locale.time)
				data.imgurl = `https://raw.githubusercontent.com/KartulUdus/PoracleJS/master/src/app/util/images/egg${data.level}.png`
				if (!data.team_id) data.team_id = 0
				data.teamname = data.team_id ? teamData[data.team_id].name : 'Harmony'
				data.color = data.team_id ? teamData[data.team_id].color : 7915600
				this.selectOneQuery('gym-info', 'id', data.gym_id)
					.then((gymInfo) => {
						data.gymname = gymInfo ? gymInfo.gym_name : data.gym_name
						data.description = gymInfo ? gymInfo.description : ''
						data.url = gymInfo ? gymInfo.url : ''
						data.park = gymInfo ? gymInfo.park : data.sponsor_id
						data.park = data.sponsor_id ? data.sponsor_id : data.park
						data.ex = data.park ? 'EX' : ''
						if (data.tth.firstDateWasLater) {
							log.warn(`Raid level${data.level} appearead, but it seems it already hatched`)
							resolve([])
							return null
						}
						this.pointInArea([data.latitude, data.longitude])
							.then((matchedAreas) => {
								data.matched = matchedAreas
								log.log({
									level: 'debug', message: `webhook message ${data.messageId} processing`, messageId: data.messageId, correlationId: data.correlationId, event: 'message:start', type: 'egg', meta: data,
								})
								this.eggWhoCares(data).then((whoCares) => {
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
										const alarmId = this.uuid
										log.log({
											level: 'debug', message: `alarm ${alarmId} processing`, event: 'alarm:start', correlationId: data.correlationId, messageId: data.messageId, alarmId,
										})
										whoCares.forEach((cares) => {
											const caresCache = this.getDiscordCache(cares.id)
											const view = {
												time: data.hatchtime,
												tthh: data.tth.hours,
												tthm: data.tth.minutes,
												tths: data.tth.seconds,
												now: new Date(),
												gymname: data.gymname,
												teamname: data.teamname,
												description: data.description,
												level: data.level,
												staticmap: data.staticmap,
												detailsurl: data.url,
												mapurl: data.mapurl,
												applemap: data.applemap,
												rocketmap: data.rocketmap,
												imgurl: data.imgurl.toLowerCase(),
												color: data.color,
												ex: data.ex,
												// geocode stuff
												lat: data.latitude,
												lon: data.longitude,
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
												areas: data.matched.join(', '),
											}

											const template = JSON.stringify(dts.egg[`${cares.template}`])
											let message = mustache.render(template, view)
											message = JSON.parse(message)

											const work = {
												message: caresCache === config.discord.limitamount + 1 ? { content: `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds` } : message,
												target: cares.id,
												name: cares.name,
												emoji: [],
												meta: { correlationId: data.correlationId, messageId: data.messageId, alarmId },
											}
											if (caresCache <= config.discord.limitamount + 1) {
												jobs.push(work)
												this.addDiscordCache(cares.id)
											}
										})
										resolve(jobs)
									}).catch((err) => {
										log.log({ level: 'error', message: `getAddress errored with: ${err.message}`, event: 'fail:getAddress' })
									})

								}).catch((err) => {
									log.log({ level: 'error', message: `raidWhoCares errored with: ${err.message}`, event: 'fail:monsterWhoCares' })
								})
							}).catch((err) => {
								log.log({ level: 'error', message: `pointsInArea errored with: ${err.message}`, event: 'fail:pointsInArea' })
							})
					}).catch((err) => {
						log.log({ level: 'error', message: `get gym-info errored with: ${err.message}`, event: 'fail:pointsInArea' })
					})
			}

		})

	}

}

module.exports = Raid
