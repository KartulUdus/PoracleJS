const Controller = require('./controller')
const config = require('config')
const log = require('../logger')
const pokemonGif = require('pokemon-gif')

const _ = require('lodash')
const mustache = require('mustache')

const monsterData = require(config.locale.monstersJson)
const teamData = require('../util/teams')
const types = require('../util/types')

const moveData = require(config.locale.movesJson)
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
require('moment-precise-range-plugin')

moment.locale(config.locale.timeformat)

const dts = require('../../../config/dts')

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
            (raid.park = ${data.park} or raid.park = 0) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < raid.distance and raid.distance != 0) or
               raid.distance = 0 and (${areastring}))
               group by humans.id, humans.name, raid.template`

			log.debug(`Query constructed for raidWhoCares: \n ${query}`)
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
            (egg.park = ${data.park} or egg.park = 0) and
            raid_level = ${data.level} and 
            (egg.team = ${data.team_id} or egg.team = 4) and 
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < egg.distance and egg.distance != 0) or
               egg.distance = 0 and (${areastring}))
			group by humans.id, humans.name, egg.template`

			log.debug(`Query constructed for eggWhoCares: \n ${query}`)
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
			switch (config.geocoding.provider.toLowerCase()) {
				case 'google': {
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${_.sample(config.geocoding.googleKey)}`
					break
				}
				case 'osm': {
					data.staticmap = 'OSMSTATICMAP'
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
					if (types[type]) e.push(types[type].emoji)
				})
				data.emoji = e
				data.emojiString = e.join('')
				if (!data.team_id) data.team_id = 0
				data.teamname = data.team_id ? teamData[data.team_id].name : 'Harmony'
				data.color = data.team_id ? teamData[data.team_id].color : 7915600

				data.quick_move = data.move_1 ? moveData[data.move_1].name : ''
				data.charge_move = data.move_2 ? moveData[data.move_2].name : ''
				this.selectOneQuery('gym-info', 'id', data.gym_id)
					.then((gymInfo) => {

						if (data.sponsor_id) data.sponsor_id = false
						data.gymname = gymInfo ? gymInfo.gym_name : data.gym_name
						data.description = gymInfo ? gymInfo.description : ''
						data.url = gymInfo ? gymInfo.url : ''
						data.park = gymInfo ? gymInfo.park : false
						data.park = data.sponsor_id ? true : data.park
						data.ex = data.park ? 'EX' : ''
						if (data.tth.firstDateWasLater) {
							log.warn(`Raid against ${data.name} was sent but already ended`)
							return null
						}
						this.insertOrUpdateQuery(
							'`activeRaid`',
							['gym_id', 'pokemon_id', 'raid_level', 'gym_name', 'start', 'end', 'created_timestamp', 'move_1', 'move_2', 'is_exclusive', 'team', 'cp', 'latitude', 'longitude'],
							[`'${data.gym_id}'`, `'${data.pokemon_id}'`, `'${data.level}'`, `'${data.gymname}'`, `FROM_UNIXTIME(${data.start})`, `FROM_UNIXTIME(${data.end})`, 'UTC_TIMESTAMP()', `'${data.move_1}'`, `'${data.move_2}'`, `${data.park}`, `'${data.team_id}'`, `'${data.cp}'`, `${data.latitude}`, `${data.longitude}`]
						).catch((err) => {
							log.error(`Updating activeRaid table errored with: ${err}`)
						})

						this.pointInArea([data.latitude, data.longitude])
							.then((matchedAreas) => {
								data.matched = matchedAreas
								this.raidWhoCares(data).then((whoCares) => {
									if (!whoCares.length || !Array.isArray(whoCares)) return null
									this.getAddress({ lat: data.latitude, lon: data.longitude }).then((geoResult) => {

										const jobs = []
										whoCares.forEach((cares) => {
											Promise.all([
												this.getCp(data.pokemon_id, 20, 10, 10, 10),
												this.getCp(data.pokemon_id, 20, 15, 15, 15),
												this.getCp(data.pokemon_id, 25, 10, 10, 10),
												this.getCp(data.pokemon_id, 25, 15, 15, 15)
											]).then((cps) => {
												const view = {
													id: data.pokemon_id,
													time: data.distime,
													tthh: data.tth.hours,
													tthm: data.tth.minutes,
													tths: data.tth.seconds,
													name: data.name,
													mincp20: cps[0],
													cp20: cps[1],
													mincp25: cps[2],
													cp25: cps[3],
													gymname: data.gymname,
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
													flagemoji: geoResult.flag,
													emojistring: data.emojistring,
													areas: data.matched.join(', '),


												}

												const template = JSON.stringify(dts.raid[`${cares.template}`])
												let message = mustache.render(template, view)
												log.debug(message)
												message = JSON.parse(message)

												const work = {
													message: message,
													target: cares.id,
													name: cares.name,
													emoji: data.emoji
												}
												jobs.push(work)
											})
										})
										resolve(jobs)
									}).catch((err) => {
										log.error(`getAddress on hatched Raid errored with: ${err}`)
									})
								}).catch((err) => {
									log.error(`raidWhoCares on hatched Raid errored with: ${err}`)
								})
							}).catch((err) => {
								log.error(`pointInArea on hatched Raid errored with: ${err}`)
							})
					}).catch((err) => {
						log.error(`Fetching gym_info on hatched Raid errored with: ${err}`)
					})
			}
			else {
				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
				data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true)
				data.hatchtime = moment(data.start * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(config.locale.time)
				data.imgurl = `https://raw.githubusercontent.com/KartulUdus/PoracleJS/master/src/app/util/images/egg${data.level}.png`
				if (!data.team_id) data.team_id = 0
				data.teamname = !data.team_id ? teamData[data.team_id].name : 'Harmony'
				data.color = !data.team_id ? teamData[data.team_id].color : 7915600
				if (!data.move_1) data.move_1 = 0
				if (!data.move_2) data.move_2 = 0
				data.cp = data.cp ? data.cp : 0

				this.selectOneQuery('gym-info', 'id', data.gym_id)
					.then((gymInfo) => {
						if (!data.sponsor_id) data.sponsor_id = false
						data.gymname = gymInfo ? gymInfo.gym_name : data.gym_name
						data.description = gymInfo ? gymInfo.description : ''
						data.url = gymInfo ? gymInfo.url : ''
						data.park = gymInfo ? gymInfo.park : false
						data.park = data.sponsor_id ? true : data.park
						data.ex = data.park ? 'EX' : ''
						if (data.tth.firstDateWasLater) {
							log.warn(`Raid level${data.level} appearead, but it seems it already hatched`)
							return null
						}

						this.insertOrUpdateQuery(
							'`activeRaid`',
							['gym_id', 'pokemon_id', 'raid_level', 'gym_name', 'start', 'end', 'created_timestamp', 'move_1', 'move_2', 'is_exclusive', 'team', 'cp', 'latitude', 'longitude'],
							[`'${data.gym_id}'`, '0', `'${data.level}'`, `'${data.gymname}'`, `FROM_UNIXTIME(${data.start})`, `FROM_UNIXTIME(${data.end})`, 'UTC_TIMESTAMP()', `'${data.move_1}'`, `'${data.move_2}'`, `${data.park}`, `'${data.team_id}'`, `'${data.cp}'`, `${data.latitude}`, `${data.longitude}`]
						).catch((err) => {
							log.error(`Updating activeRaid table errored with: ${err}`)
						})

						this.pointInArea([data.latitude, data.longitude])
							.then((matchedAreas) => {
								data.matched = matchedAreas
								this.eggWhoCares(data).then((whoCares) => {
									if (!whoCares.length || !Array.isArray(whoCares)) return null
									this.getAddress({ lat: data.latitude, lon: data.longitude }).then((geoResult) => {
										const jobs = []
										whoCares.forEach((cares) => {
											const view = {
												time: data.hatchtime,
												tthh: data.tth.hours,
												tthm: data.tth.minutes,
												tths: data.tth.seconds,
												gymname: data.gymname,
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
												flagemoji: geoResult.flag,
												areas: data.matched.join(', '),
											}

											const template = JSON.stringify(dts.egg[`${cares.template}`])
											let message = mustache.render(template, view)
											log.debug(message)
											message = JSON.parse(message)

											const work = {
												lat: data.latitude.toString().substring(0, 8),
												lon: data.longitude.toString().substring(0, 8),
												message: message,
												target: cares.id,
												name: cares.name,
												emoji: []
											}
											jobs.push(work)
										})
										resolve(jobs)
									}).catch((err) => {
										log.error(`getAddress on Raid errored with: ${err}`)
									})
								}).catch((err) => {
									log.error(`eggWhoCares on Raid errored with: ${err}`)
								})
							}).catch((err) => {
								log.error(`pointInArea on Raid errored with: ${err}`)
							})
					}).catch((err) => {
						log.error(`Fetching gym_info on Raid errored with: ${err}`)
					})
			}

		})

	}

}

module.exports = Raid
