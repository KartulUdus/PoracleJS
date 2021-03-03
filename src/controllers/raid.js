const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')

class Raid extends Controller {
	async raidWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping from raid
		join humans on (humans.id = raid.id and humans.current_profile_no = raid.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and
		(pokemon_id=${data.pokemon_id} or (pokemon_id=9000 and raid.level=${data.level})) and
		(raid.team = ${data.team_id} or raid.team = 4) and
		(raid.exclusive = ${data.ex} or raid.exclusive = 0) and
		(raid.form = ${data.form} or raid.form = 0) `

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
					) < raid.distance and raid.distance != 0)
					or
					(
						raid.distance = 0 and (${areastring})
					)
			)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping
			`)
		} else {
			query = query.concat(`
				and ((raid.distance = 0 and (${areastring})) or raid.distance > 0)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping
			`)
		}
		// this.log.silly(`${data.gym_id}: Raid query ${query}`)
		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => +res.distance === 0 || +res.distance > 0 && +res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
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

	async eggWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping from egg
		join humans on (humans.id = egg.id and humans.current_profile_no = egg.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and
		egg.level = ${data.level} and
		(egg.team = ${data.team_id} or egg.team = 4) and
		(egg.exclusive = ${data.ex} or egg.exclusive = 0) `

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
					) < egg.distance and egg.distance != 0)
					or
					(
						egg.distance = 0 and (${areastring})
					)
			)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping
			`)
		} else {
			query = query.concat(`
				and ((egg.distance = 0 and (${areastring})) or egg.distance > 0)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping
			`)
		}

		this.log.silly(`${data.gym_id}: Egg query ${query}`)

		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => +res.distance === 0 || +res.distance > 0 && +res.distance > super.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
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
			const logReference = data.gym_id
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

			if (!data.team_id) data.team_id = 0
			if (data.name) {
				data.name = this.escapeJsonString(data.name)
				data.gymName = data.name
			}
			if (data.gym_name) {
				data.gym_name = this.escapeJsonString(data.gym_name)
				data.gymName = data.gym_name
			}
			data.teamId = data.team_id ? data.team_id : 0
			data.teamName = data.team_id ? this.GameData.utilData.teams[data.team_id].name : 'Harmony'
			data.gymColor = data.team_id ? this.GameData.utilData.teams[data.team_id].color : 'BABABA'
			data.ex = !!(data.ex_raid_eligible || data.is_ex_raid_eligible)
			data.gymUrl = data.gym_url ? data.gym_url : ''
			data.disappearTime = moment(data.end * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.color = data.gymColor // deprecated
			data.distime = data.disappearTime // deprecated

			data.matched = await this.pointInArea([data.latitude, data.longitude])

			data.weather = this.weatherData.getCurrentWeatherInCell(this.weatherData.getWeatherCellId(data.latitude, data.longitude)) || 0		// complete weather data from weather cache

			if (data.pokemon_id) {
				if (data.form === undefined || data.form === null) data.form = 0
				const monster = this.GameData.monsters[`${data.pokemon_id}_${data.form}`] ? this.GameData.monsters[`${data.pokemon_id}_${data.form}`] : this.GameData.monsters[`${data.pokemon_id}_0`]
				if (!monster) {
					this.log.warn(`${logReference}: Couldn't find monster in:`, data)
					return
				}
				data.pokemonId = data.pokemon_id
				data.nameEng = monster.name
				data.formId = monster.form.id
				data.formNameEng = monster.form.name
				data.genderDataEng = this.GameData.utilData.genders[data.gender]
				data.evolutionNameEng = data.evolution ? this.GameData.utilData.evolution[data.evolution].name : ''
				data.tth = moment.preciseDiff(Date.now(), data.end * 1000, true)
				data.formname = data.formNameEng // deprecated
				data.evolutionname = data.evolutionNameEng // deprecated
				//				data.gif = pokemonGif(Number(data.pokemon_id)) // deprecated
				data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}${data.evolution > 0 ? `_${data.evolution.toString()}` : ''}.png`
				data.stickerUrl = `${this.config.general.stickerUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}${data.evolution > 0 ? `_${data.evolution.toString()}` : ''}.webp`

				const e = []
				const t = []
				const n = []
				monster.types.forEach((type) => {
					e.push(this.GameData.utilData.types[type.name].emoji)
					t.push(type.id)
					n.push(type.name)
				})
				data.types = t
				data.typeNameEng = n
				data.emoji = e
				data.boostingWeathers = data.types.map((type) => parseInt(Object.keys(this.GameData.utilData.weatherTypeBoost).find((key) => this.GameData.utilData.weatherTypeBoost[key].includes(type)), 10))
				data.boosted = !!data.boostingWeathers.includes(data.weather)

				data.ex = !!(data.ex_raid_eligible || data.is_ex_raid_eligible)
				if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
					this.log.debug(`${this.logReference}: Raid on ${data.gymName} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
					return []
				}

				const whoCares = await this.raidWhoCares(data)

				if (whoCares.length) {
					this.log.info(`${logReference}: Raid on ${data.gymName} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
				} else {
					this.log.verbose(`${logReference}: Raid on ${data.gymName} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
				}

				if (!whoCares[0]) return []

				let discordCacheBad = true // assume the worst
				whoCares.forEach((cares) => {
					if (!this.isRateLimited(cares.id)) discordCacheBad = false
				})

				if (discordCacheBad) {
					whoCares.forEach((cares) => {
						this.log.verbose(`${logReference}: Not creating raid alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
					})

					return []
				}
				const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
				const jobs = []

				if (pregenerateTile && this.config.geocoding.staticMapType.raid) {
					data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'raid', data, this.config.geocoding.staticMapType.raid)
					this.log.debug(`${logReference}: Tile generated ${data.staticMap}`)
				}
				data.staticmap = data.staticMap // deprecated

				for (const cares of whoCares) {
					this.log.debug(`${logReference}: Creating raid alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

					const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
					if (rateLimitTtr) {
						this.log.verbose(`${logReference}: Not creating raid alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
						// eslint-disable-next-line no-continue
						continue
					}
					this.log.verbose(`${logReference}: Creating raid alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

					const language = cares.language || this.config.general.locale
					const translator = this.translatorFactory.Translator(language)

					data.name = translator.translate(data.nameEng)
					data.formName = translator.translate(data.formNameEng)
					data.evolutionName = translator.translate(data.evolutionNameEng)
					data.typeName = data.typeNameEng.map((type) => translator.translate(type)).join(', ')
					data.typeEmoji = data.emoji.map((emoji) => translator.translate(emoji)).join('')
					data.quickMoveId = data.move_1 ? data.move_1 : ''
					data.quickMoveName = this.GameData.moves[data.move_1] ? translator.translate(this.GameData.moves[data.move_1].name) : ''
					data.quickMoveEmoji = this.GameData.moves[data.move_1] && this.GameData.moves[data.move_1].type ? translator.translate(this.GameData.utilData.types[this.GameData.moves[data.move_1].type].emoji) : ''
					data.chargeMoveId = data.move_2 ? data.move_2 : ''
					data.chargeMoveName = this.GameData.moves[data.move_2] ? translator.translate(this.GameData.moves[data.move_2].name) : ''
					data.chargeMoveEmoji = this.GameData.moves[data.move_2] && this.GameData.moves[data.move_2].type ? translator.translate(this.GameData.utilData.types[this.GameData.moves[data.move_2].type].emoji) : ''
					data.boostWeatherId = data.boosted ? data.weather : ''
					data.boostWeatherName = data.boosted ? translator.translate(this.GameData.utilData.weather[data.weather].name) : ''
					data.boostWeatherEmoji = data.boosted ? translator.translate(this.GameData.utilData.weather[data.weather].emoji) : ''
					data.quickMove = data.quickMoveName // deprecated
					data.chargeMove = data.chargeMoveName // deprecated
					data.move1 = data.quickMoveName // deprecated
					data.move2 = data.chargeMoveName // deprecated
					data.move1emoji = data.quickMoveEmoji // deprecated
					data.move2emoji = data.chargeMoveEmoji // deprecated

					const view = {
						...geoResult,
						...data,
						pokemonName: data.pokemonName,
						id: data.pokemon_id,
						baseStats: monster.stats,
						time: data.disappearTime,
						tthh: data.tth.hours,
						tthm: data.tth.minutes,
						tths: data.tth.seconds,
						confirmedTime: data.disappear_time_verified,
						now: new Date(),
						genderData: { name: translator.translate(data.genderDataEng.name), emoji: translator.translate(data.genderDataEng.emoji) },
						areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
					}

					let [platform] = cares.type.split(':')
					if (platform == 'webhook') platform = 'discord'

					const mustache = this.getDts(logReference, 'raid', platform, cares.template, language)
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
			}

			data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true)
			data.hatchTime = moment(data.start * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.hatchtime = data.hatchTime // deprecated
			data.imgUrl = `${this.config.general.imgUrl}egg${data.level}.png`
			data.stickerUrl = `${this.config.general.stickerUrl}egg${data.level}.webp`

			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				this.log.debug(`${logReference}: Egg at ${data.gymName} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			const whoCares = await this.eggWhoCares(data)

			if (whoCares.length) {
				this.log.info(`${logReference}: Egg level ${data.level} on ${data.gymName} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Egg level ${data.level} on ${data.gymName} appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			}

			if (!whoCares[0]) return []

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating egg alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
				})

				return []
			}
			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile && this.config.geocoding.staticMapType.raid) {
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'raid', data, this.config.geocoding.staticMapType.raid)
				this.log.debug(`${logReference}: Tile generated ${data.staticMap}`)
			}
			data.staticmap = data.staticMap // deprecated

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating egg alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)
				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating egg alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating egg alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				const language = cares.language || this.config.general.locale
				// eslint-disable-next-line no-unused-vars
				const translator = this.translatorFactory.Translator(language)

				const view = {
					...geoResult,
					...data,
					id: data.pokemon_id,
					time: data.hatchtime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					now: new Date(),
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}

				let [platform] = cares.type.split(':')
				if (platform == 'webhook') platform = 'discord'

				const mustache = this.getDts(logReference, 'egg', platform, cares.template, language)
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
			this.log.error(`${data.gym_id}: Can't seem to handle raid: `, e, data)
		}
	}
}

module.exports = Raid
