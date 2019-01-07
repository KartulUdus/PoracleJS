const Controller = require('./controller')
const log = require('../logger')
const config = require('config')

const _ = require('lodash')
const mustache = require('mustache')
const pokemonGif = require('pokemon-gif')

const monsterData = require(config.locale.monstersJson)
const weatherData = require('../util/weather')

const types = require('../util/types')

const moveData = require(config.locale.movesJson)
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
require('moment-precise-range-plugin')

moment.locale(config.locale.timeformat)


class Monster extends Controller {

/*
*
*
*
*
* monsterWhoCares, takes data object
*/
	async monsterWhoCares(data) {
		return new Promise((resolve) => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `)
			})
			const query = `
			select humans.id, humans.name, monsters.template from monsters 
            join humans on humans.id = monsters.id
            where humans.enabled = 1 and
            pokemon_id=${data.pokemon_id} and 
            min_iv<=${data.iv} and
            max_iv>=${data.iv} and
            min_cp<=${data.cp} and
            max_cp>=${data.cp} and
            (form = ${data.form} or form = 0) and
            min_level<=${data.pokemon_level} and
            max_level>=${data.pokemon_level} and
            atk<=${data.individual_attack} and
            def<=${data.individual_defense} and
            sta<=${data.individual_stamina} and
            min_weight<=${data.weight} * 1000 and
            max_weight>=${data.weight} * 1000 and
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < monsters.distance and monsters.distance != 0) or
               monsters.distance = 0 and (${areastring}))
               group by humans.id, humans.name, monsters.template `


			log.debug(`Query constructed for monsterhWhoCares: \n ${query}`)
			this.db.query(query)
				.then((result) => {
					log.info(`${data.name} appeared and ${result[0].length} humans cared`)
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`monsterWhoCares errored with: ${err}`)
				})
		})
	}

	findIvColor(iv) {

		// it must be perfect if none of the ifs kick in
		// orange / legendary
		let colorIdx = 5

		if (iv < 25) colorIdx = 0 // gray / trash / missing
		else if (iv < 50) colorIdx = 1 // white / common
		else if (iv < 82) colorIdx = 2 // green / uncommon
		else if (iv < 90) colorIdx = 3 // blue / rare
		else if (iv < 100) colorIdx = 4 // purple epic

		return parseInt(this.ivColorData[colorIdx].replace(/^#/, ''), 16)
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
			data.name = monsterData[data.pokemon_id].name ? monsterData[data.pokemon_id].name : 'errormon'
			data.formname = ''
			data.iv = data.weight ? ((data.individual_attack + data.individual_defense + data.individual_stamina) / 0.45).toFixed(2) : -1
			data.individual_attack = data.weight ? data.individual_attack : 0
			data.individual_defense = data.weight ? data.individual_defense : 0
			data.individual_stamina = data.weight ? data.individual_stamina : 0
			data.cp = data.weight ? data.cp : 0
			data.pokemon_level = data.weight ? data.pokemon_level : 0
			data.move_1 = data.weight ? data.move_1 : 0
			data.move_2 = data.weight ? data.move_2 : 0
			data.weight = data.weight ? data.weight.toFixed(1) : 0
			data.quick_move = data.weight && moveData[data.move_1] ? moveData[data.move_1].name : ''
			data.charge_move = data.weight && moveData[data.move_2] ? moveData[data.move_2].name : ''
			if (data.form === undefined || data.form === null) data.form = 0
			if (!data.weather) data.weather = 0
			data.boost = weatherData[data.weather].name ? weatherData[data.weather].name : ''
			data.boostemoji = weatherData[data.weather].emoji ? weatherData[data.weather].emoji : ''
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.color = monsterData[data.pokemon_id].types[0] ? types[monsterData[data.pokemon_id].types[0]].color : 0
			data.ivcolor = this.findIvColor(data.iv)
			data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true)
			data.distime = moment(data.disappear_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(config.locale.time)
			data.imgurl = `${config.general.imgurl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form.toString().padStart(2, '0')}.png`
			const e = []
			monsterData[data.pokemon_id].types.forEach((type) => {
				e.push(types[type].emoji)
			})
			data.emoji = e
			data.emojiString = e.join('')

			// Stop handling if it already disappeared
			if (data.tth.firstDateWasLater) {
				log.warn(`Weird, the ${data.name} already disappeared`)
				return null
			}

			this.pointInArea([data.latitude, data.longitude]).then((matchedAreas) => {
				data.matched = matchedAreas
				this.monsterWhoCares(data).then((whocares) => {
					// if noone cares or the result is not iterable, break out of processing
					if (!whocares.length || !Array.isArray(whocares)) return null
					this.getAddress({ lat: data.latitude, lon: data.longitude }).then((geoResult) => {

						const jobs = []
						whocares.forEach((cares) => {


							const view = {
								id: data.pokemon_id,
								time: data.distime,
								tthh: data.tth.hours,
								tthm: data.tth.minutes,
								tths: data.tth.seconds,
								name: data.name,
								move1: data.quick_move,
								move2: data.charge_move,
								iv: data.iv,
								cp: data.cp,
								level: data.pokemon_level,
								atk: data.individual_attack,
								def: data.individual_defense,
								sta: data.individual_stamina,
								weight: data.weight,
								staticmap: data.staticmap,
								mapurl: data.mapurl,
								applemap: data.applemap,
								rocketmap: data.rocketmap,
								form: data.formname,
								imgurl: data.imgurl.toLowerCase(),
								gif: pokemonGif(Number(data.pokemon_id)),
								color: data.color,
								ivcolor: data.ivcolor,
								boost: data.boost,
								boostemoji: data.boostemoji,
								areas: data.matched.join(','),

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
								emojiString: data.emojiString

							}
							const monsterDts = data.iv === -1 && this.mdts.monsterNoIv
								? this.mdts.monsterNoIv[`${cares.template}`]
								: this.mdts.monster[`${cares.template}`]
							const template = JSON.stringify(monsterDts)
							let message = mustache.render(template, view)
							message = JSON.parse(message)

							const work = {
								lat: data.latitude.toString().substring(0, 8),
								lon: data.longitude.toString().substring(0, 8),
								message: message,
								target: cares.id,
								name: cares.name,
								emoji: data.emoji
							}
							jobs.push(work)

						})
						resolve(jobs)

					}).catch((err) => {
						log.error(`getAddress errored with: ${err}`)
					})
				}).catch((err) => {
					log.error(`monsterWhoCares errored with: ${err}`)
				})
			}).catch((err) => {
				log.error(`pointsInArea errored with: ${err}`)
			})
		})
	}
}

module.exports = Monster