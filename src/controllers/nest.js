const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')

/**
 * Controller for processing nest webhooks
 */
class Nest extends Controller {
	async nestWhoCares(obj) {
		const data = obj
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, nests.template, nests.distance, nests.clean, nests.ping from nests
		join humans on (humans.id = nests.id and humans.current_profile_no = nests.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and
		((nests.pokemon_id = 0 or nests.pokemon_id='${data.pokemon_id}') and nests.min_spawn_avg <= ${data.pokemon_avg}) and
		(nests.form = ${data.form} or nests.form = 0)`

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
					) < nests.distance and nests.distance != 0)
					or
					(
						nests.distance = 0 and (${areastring})
					)
			)
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
		} else {
			query = query.concat(`
				and ((nests.distance = 0 and (${areastring})) or nests.distance > 0)
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
		// const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.nest_id

			data.longitude = data.lon
			data.latitude = data.lat
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

			const nestExpiration = data.reset_time + (7 * 24 * 60 * 60)
			data.tth = moment.preciseDiff(Date.now(), nestExpiration * 1000, true)
			data.disappearDate = moment(nestExpiration * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.date)
			data.resetDate = moment(data.reset_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.date)
			data.disappearTime = moment(nestExpiration * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.resetTime = moment(data.reset_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)

			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.imgUrl = data.pokestopUrl // deprecated
			data.distime = data.disappearTime // deprecated

			// Stop handling if it already disappeared or is about to go away
			// if (data.tth.firstDateWasLater || ((data.tth.days * 24 * 3600) + (data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
			// 	this.log.debug(`${data.pokestop_id} Nest already disappeared or is about to go away in: ${data.tth.days}d ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
			// 	return []
			// }

			data.matched = this.pointInArea([data.latitude, data.longitude])

			if (data.form === undefined || data.form === null) data.form = 0
			const monster = this.GameData.monsters[`${data.pokemon_id}_${data.form}`] ? this.GameData.monsters[`${data.pokemon_id}_${data.form}`] : this.GameData.monsters[`${data.pokemon_id}_0`]
			if (!monster) {
				this.log.warn(`${logReference}: Couldn't find monster in:`, data)
				return
			}

			data.nestName = this.escapeJsonString(data.name)
			data.pokemonId = data.pokemon_id
			data.nameEng = monster.name
			data.formId = monster.form.id
			data.formNameEng = monster.form.name
			data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.png`
			data.stickerUrl = `${this.config.general.stickerUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.webp`
			data.color = this.GameData.utilData.types[monster.types[0].name].color
			data.pokemonCount = data.pokemon_count
			data.pokemonSpawnAvg = data.pokemon_avg

			const whoCares = await this.nestWhoCares(data)

			if (whoCares.length) {
				this.log.info(`${logReference}: Nest ${data.name} found in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Nest ${data.name} found in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			}

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating nest alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
				})

				return []
			}

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile && this.config.geocoding.staticMapType.nest) {
				// Attempt to calculate best position for nest
				const position = this.tileserverPregen.autoposition({
					polygons:
						JSON.parse(data.poly_path).map((x) => ({ path: x })),
				}, 500, 250)
				data.zoom = Math.min(position.zoom, 16)
				data.map_longitude = position.longitude
				data.map_latitude = position.latitude
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'nest', data, this.config.geocoding.staticMapType.nest)
			}
			data.staticmap = data.staticMap // deprecated

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating nest alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating nest (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating nest alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				// full build
				data.name = translator.translate(data.nameEng)
				data.formName = translator.translate(data.formNameEng)

				const view = {
					...geoResult,
					...data,
					time: data.distime,
					tthd: data.tth.days,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					now: new Date(),
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}

				let [platform] = cares.type.split(':')
				if (platform === 'webhook') platform = 'discord'

				const mustache = this.getDts(logReference, 'nest', platform, cares.template, language)
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
			this.log.error(`${data.pokestop_id}: Can't seem to handle nest: `, e, data)
		}
	}
}

module.exports = Nest
