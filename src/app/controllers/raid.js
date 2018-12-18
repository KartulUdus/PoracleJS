const Controller = require('./controller')
const config = require('config');
const log = require('../logger');

const _ = require('lodash')
const mustache = require('mustache');


const monsterData = require(config.locale.monstersJson)
const teamData = require('../util/teams')
const weatherData = require('../util/weather')
const raidCpData = require('../util/raidcp')
const questData = require('../util/quests')
const rewardData = require('../util/rewards')
const moveData = require(config.locale.movesJson)
const ivColorData = config.discord.iv_colors
const moment = require('moment')
require('moment-precise-range-plugin');

const dts = require('../../../config/dts')

class Raid extends Controller{

/*
* raidWhoCares, takes data object
*/
	async raidWhoCares(data) {
		return new Promise(resolve => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `);
			});
			const query =
				`select * from raid 
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
               group by humans.id`;

			log.debug(`Query constructed for raidWhoCares: \n ${query}`)
			this.db.query(query)
				.then(
					function(result){
						log.info(`Raid against ${data.name} appeared and ${result.length} humans cared`);
						resolve(result[0])
					}
				)
				.catch((err) => {log.error(`raidWhoCares errored with: ${err}`)})
		})
	}

	async eggWhoCares(data) {
		return new Promise(resolve => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `);
			});
			const query =
				`select * from egg 
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
               egg.distance = 0 and (${areastring}))`;

			log.debug(`Query constructed for eggWhoCares: \n ${query}`)
			this.db.query(query)
				.then(
					function(result){
						log.info(`Raid egg level ${data.level} appeared and ${result.length} humans cared`);
						resolve(result[0])
					}
				)
				.catch((err) => {log.error(`eggWhoCares errored with: ${err}`)})
		})
	}

	async handle(data){
		return new Promise(resolve => {
			switch(config.geocoding.provider.toLowerCase()){
				case "google":{
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${_.sample(config.geocoding.googleKey)}`;
					break
				}
				case "osm":{
					data.staticmap = ``
					break
				}
			}

			// If there's a pokemon_id in the raid hook, we assume it's hatched
			if(data.pokemon_id){

				console.log(data)
				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
				data.tth = moment.preciseDiff(Date.now(), data.end * 1000, true)
				data.distime = moment(data.end * 1000).format(config.locale.time)
				data.name = monsterData[data.pokemon_id].name || 'errormon'
				data.imgurl = `${config.general.imgurl}pokemon_icon_${(data.pokemon_id).toString().padStart(3, '0')}_00}.png`;
				const e = [];
				monsterData[data.pokemon_id].types.forEach((type) => {
					e.push(type.emoji);
				})
				data.emoji = e
				data.teamname = !!(data.team_id) ? teamData[data.team_id].name : 'Harmony'
				data.color = !!(data.team_id) ? teamData[data.team_id].color : 0
				if(!data.team_id) data.team_id = 4
				data.quick_move = !!(data.move_1) ? moveData[data.move_1].name : ''
				data.charge_move = !!(data.move_2) ? moveData[data.move_2].name : ''
				this.selectOneQuery('gym-info', 'id', data.gym_id)
					.then((gymInfo) => {

						data.gymname = gymInfo ? gymInfo.gym_name : '';
						data.description = gymInfo ? gymInfo.description : '';
						data.url = gymInfo ? gymInfo.url : '';
						data.park = gymInfo ? gymInfo.park : false;
						data.ex = data.park ?  'EX' : ''
						if (data.tth.firstDateWasLater){
							log.warn(`Raid against ${data.name} was sent but already ended`)
							return null
						}
						this.pointInArea([data.latitude, data.longitude])
							.then((matchedAreas) => {
								data.matched = matchedAreas
								this.raidWhoCares(data).then((whoCares) => {
									if (!whoCares.length || !Array.isArray(whoCares)) return null
									this.getAddress({ lat: data.latitude, lon: data.longitude }).then((geoResult) => {

										let jobs = []
										whoCares.forEach((cares) => {

											const view = {
												time: data.distime,
												tthh: data.tth.hours,
												tthm: data.tth.minutes,
												tths: data.tth.seconds,
												name: data.name,
												cp20: raidCpData[data.pokemon_id].max_cp_20,
												cp25: raidCpData[data.pokemon_id].max_cp_25,
												mincp20: raidCpData[data.pokemon_id].min_cp_20,
												mincp25: raidCpData[data.pokemon_id].min_cp_25,
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
											};
											const template = JSON.stringify(dts.raid);
											let message = mustache.render(template, view);
											log.debug(message);
											message = JSON.parse(message);

											let work = {
												message: message,
												target: cares.id,
												name: cares.name,
												emoji: data.emoji
											}
											jobs.push(work)
										})
										resolve(jobs)
									})
								})
							})
					})
			} else {
				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
				data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true);
				data.hatchtime = moment(data.start * 1000).format(config.locale.time);
				data.imgurl = `https://raw.githubusercontent.com/KartulUdus/PoracleJS/master/app/src/util/images/egg${data.level}.png`;
				data.teamname = !!(data.team_id) ? teamData[data.team_id].name : 'Harmony'
				data.color = !!(data.team_id) ? teamData[data.team_id].color : 0
				if(!data.team_id) data.team_id = 4
				this.selectOneQuery('gym-info', 'id', data.gym_id)
					.then((gymInfo) => {
						data.gymname = gymInfo.gym_name || '';
						data.description = gymInfo.description || '';
						data.url = gymInfo.url || '';
						data.park = gymInfo.park || false;
						data.ex = ''
						if (gymInfo.park) data.ex = 'EX'
						if (data.tth.firstDateWasLater){
							log.warn(`Raid level${data.level} appearead, but it seems it already hatched`)
							return null
						}
						this.pointInArea([data.latitude, data.longitude])
							.then((matchedAreas) => {
								data.matched = matchedAreas
								this.eggWhoCares(data).then((whoCares) => {
									if (!whoCares.length || !Array.isArray(whoCares)) return null
									this.getAddress({ lat: data.latitude, lon: data.longitude }).then((geoResult) => {
										let jobs = []
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
											};

											const template = JSON.stringify(dts.egg);
											let message = mustache.render(template, view);
											log.debug(message);
											message = JSON.parse(message)

											let work = {
												message: message,
												target: cares.id,
												name: cares.name,
												emoji: []
											}
											jobs.push(work)
										})
										resolve(jobs)
									})
								})
							})
						})
					}



		})

	}

}

module.exports = Raid