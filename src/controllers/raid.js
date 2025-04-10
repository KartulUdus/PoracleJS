const geoTz = require('geo-tz')
const moment = require('moment-timezone')
require('moment-precise-range-plugin')

const Controller = require('./controller')

class Raid extends Controller {
	async raidWhoCares(data) {
		const { areastring, strictareastring } = this.buildAreaString(data.matched)

		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping from raid
		join humans on (humans.id = raid.id and humans.current_profile_no = raid.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%raid%') and
		(pokemon_id=${data.pokemon_id} or (pokemon_id=9000 and (raid.level=${data.level} or raid.level=90))) and
		(raid.team = ${data.team_id} or raid.team = 4) and
		(raid.exclusive = ${data.ex} or raid.exclusive = 0) and
		(raid.form = ${data.form} or raid.form = 0) and
		(raid.evolution = 9000 or raid.evolution = ${data.evolution}) and
		(raid.move = 9000 or raid.move = ${data.move_1} or raid.move = ${data.move_2})
		${strictareastring}
		and
		((raid.gym_id='${data.gym_id}' and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%specificgym%') ) or (raid.gym_id is NULL and `

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
					) < raid.distance and raid.distance != 0)
					or
					(
						raid.distance = 0 and (${areastring})
					)
			)
			))
			`)
			//				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping
		} else {
			query = query.concat(`
				and ((raid.distance = 0 and (${areastring})) or raid.distance > 0)
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping
		}
		this.log.silly(`${data.gym_id}: Raid query ${query}`)
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
		const { areastring, strictareastring } = this.buildAreaString(data.matched)

		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping from egg
		join humans on (humans.id = egg.id and humans.current_profile_no = egg.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%egg%') and
		(egg.level = ${data.level} or egg.level = 90) and
		(egg.team = ${data.team_id} or egg.team = 4) and
		(egg.exclusive = ${data.ex} or egg.exclusive = 0)
		${strictareastring}
		and
		((egg.gym_id='${data.gym_id}' and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%specificgym%') ) or (egg.gym_id is NULL and `

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
					) < egg.distance and egg.distance != 0)
					or
					(
						egg.distance = 0 and (${areastring})
					)
			)
			))
			`)
			//				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping
		} else {
			query = query.concat(`
				and ((egg.distance = 0 and (${areastring})) or egg.distance > 0)
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping
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
		const data = obj
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.gym_id

			Object.assign(data, this.config.general.dtsDictionary)
			data.googleMapUrl = `https://maps.google.com/maps?q=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/place?coordinate=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			if (this.config.general.rdmURL) {
				data.rdmUrl = `${this.config.general.rdmURL}${!this.config.general.rdmURL.endsWith('/') ? '/' : ''}@gym/${data.gym_id}`
			}
			if (this.config.general.reactMapURL) {
				data.reactMapUrl = `${this.config.general.reactMapURL}${!this.config.general.reactMapURL.endsWith('/') ? '/' : ''}id/gyms/${data.gym_id}`
			}
			if (this.config.general.rocketMadURL) {
				data.rocketMadUrl = `${this.config.general.rocketMadURL}${!this.config.general.rocketMadURL.endsWith('/') ? '/' : ''}?lat=${data.latitude}&lon=${data.longitude}&zoom=18.0`
			}

			data.team_id ??= 0
			if (data.name) {
				data.name = this.escapeJsonString(data.name)
				data.gymName = data.name
			}
			if (data.gym_name) {
				data.gym_name = this.escapeJsonString(data.gym_name)
				data.gymName = data.gym_name
			}
			data.gymId = data.gym_id
			data.teamId = data.team_id
			data.gymColor = this.GameData.utilData.teams[data.team_id].color
			data.ex = !!(data.ex_raid_eligible ?? data.is_ex_raid_eligible)
			data.gymUrl = data.gym_url || data.url || ''
			const disappearTime = moment(data.end * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString())
			data.disappearTime = disappearTime.format(this.config.locale.time)
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.color = data.gymColor // deprecated
			data.distime = data.disappearTime // deprecated

			data.matchedAreas = this.pointInArea([data.latitude, data.longitude])
			data.matched = data.matchedAreas.map((x) => x.name.toLowerCase())

			const weatherCellId = this.weatherData.getWeatherCellId(data.latitude, data.longitude)
			data.weather = this.weatherData.getCurrentWeatherInCell(weatherCellId) || 0		// complete weather data from weather cache
			data.gameWeatherId = data.weather
			data.gameWeatherNameEng = data.weather ? this.GameData.utilData.weather[data.gameWeatherId].name : ''

			data.levelNameEng = this.GameData.utilData.raidLevels[data.level]

			if (this.config.general.ignoreLongRaids
				&& (data.end - data.start) > 47 * 60) {
				this.log.verbose(`${this.logReference}: Raid/Egg on ${data.gymName} will be longer than 47 minutes - ignored`)
				return []
			}

			if (data.pokemon_id) {
				data.form ??= 0
				const monster = this.GameData.monsters[`${data.pokemon_id}_${data.form}`] || this.GameData.monsters[`${data.pokemon_id}_0`]
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
				data.quickMoveId = data.move_1 ?? ''
				data.chargeMoveId = data.move_2 ?? ''
				data.quickMoveNameEng = this.GameData.moves[data.move_1] ? this.GameData.moves[data.move_1].name : ''
				data.chargeMoveNameEng = this.GameData.moves[data.move_2] ? this.GameData.moves[data.move_2].name : ''
				data.shinyPossible = this.shinyPossible.isShinyPossible(data.pokemonId, data.formId)
				// eslint-disable-next-line prefer-destructuring
				data.generation = this.GameData.utilData.genException[`${data.pokemon_id}_${data.form}`] || Object.entries(this.GameData.utilData.genData)
					.find(([, genData]) => data.pokemonId >= genData.min && data.pokemonId <= genData.max)?.[0]
				data.generationNameEng = this.GameData.utilData.genData[data.generation]?.name
				data.generationRoman = this.GameData.utilData.genData[data.generation]?.roman

				data.ex = !!(data.ex_raid_eligible || data.is_ex_raid_eligible)
				if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
					this.log.debug(`${this.logReference}: Raid on ${data.gymName} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
					return []
				}

				const whoCares = data.poracleTest ? [{
					...data.poracleTest,
					clean: false,
					ping: '',
				}] : await this.raidWhoCares(data)

				if (whoCares.length) {
					this.log.info(`${logReference}: Raid level ${data.level} on ${data.gymName} appeared at [${data.latitude.toFixed(3)},${data.longitude.toFixed(3)}] in areas (${data.matched}) and ${whoCares.length} humans cared.`)
				} else {
					this.log.verbose(`${logReference}: Raid level ${data.level} on ${data.gymName} appeared at [${data.latitude.toFixed(3)},${data.longitude.toFixed(3)}] in areas (${data.matched}) and ${whoCares.length} humans cared.`)
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

				setImmediate(async () => {
					try {
						if (this.imgUicons) data.imgUrl = await this.imgUicons.pokemonIcon(data.pokemon_id, data.form, data.evolution, data.gender, data.costume, data.alignment || 0, data.shinyPossible && this.config.general.requestShinyImages) || this.config.fallbacks?.imgUrlGym
						if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.pokemonIcon(data.pokemon_id, data.form, data.evolution, data.gender, data.costume, data.alignment || 0, data.shinyPossible && this.config.general.requestShinyImages) || this.config.fallbacks?.imgUrlGym
						if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.pokemonIcon(data.pokemon_id, data.form, data.evolution, data.gender, data.costume, data.alignment || 0, data.shinyPossible && this.config.general.requestShinyImages)

						const geoResult = await this.getAddress({
							lat: data.latitude,
							lon: data.longitude,
						})
						const jobs = []

						require('./common/nightTime').setNightTime(data, disappearTime, this.config)

						await this.getStaticMapUrl(logReference, data, 'raid', ['pokemon_id', 'latitude', 'longitude', 'form', 'level', 'imgUrl', 'style'])
						data.intersection = await this.obtainIntersection(data)

						data.staticmap = data.staticMap // deprecated
						data.types = monster.types.map((type) => type.id)

						await require('./common/weather').calculateForecastImpact(data, this.GameData, weatherCellId, this.weatherData, data.end, this.config)

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
							let [platform] = cares.type.split(':')
							if (platform === 'webhook') platform = 'discord'

							data.name = translator.translate(data.nameEng)
							data.formName = translator.translate(data.formNameEng)
							data.evolutionName = translator.translate(data.evolutionNameEng)

							data.formNormalisedEng = data.formNameEng === 'Normal' ? '' : data.formNameEng
							data.formNormalised = translator.translate(data.formNormalisedEng)

							if (data.evolution) {
								data.fullNameEng = translator.format(
									this.GameData.utilData.megaName[data.evolution],
									data.nameEng.concat(data.formNormalisedEng ? ' ' : '', data.formNormalisedEng),
								)
								data.fullName = translator.translateFormat(
									this.GameData.utilData.megaName[data.evolution],
									data.name.concat(data.formNormalised ? ' ' : '', data.formNormalised),
								)
							} else {
								data.fullNameEng = data.nameEng.concat(data.formNormalisedEng ? ' ' : '', data.formNormalisedEng)
								data.fullName = data.name.concat(data.formNormalised ? ' ' : '', data.formNormalised)
							}

							data.levelName = translator.translateFormat(data.levelNameEng)
							data.megaName = data.evolution ? translator.translateFormat(this.GameData.utilData.megaName[data.evolution], data.name) : data.name
							data.teamNameEng = this.GameData.utilData.teams[data.team_id].name
							data.teamName = translator.translate(data.teamNameEng)
							data.teamEmoji = this.emojiLookup.lookup(this.GameData.utilData.teams[data.team_id].emoji, platform)
							data.quickMoveName = this.GameData.moves[data.move_1] ? translator.translate(this.GameData.moves[data.move_1].name) : ''
							data.quickMoveEmoji = this.GameData.moves[data.move_1] && this.GameData.moves[data.move_1].type ? translator.translate(this.emojiLookup.lookup(this.GameData.utilData.types[this.GameData.moves[data.move_1].type].emoji, platform)) : ''
							data.chargeMoveName = this.GameData.moves[data.move_2] ? translator.translate(this.GameData.moves[data.move_2].name) : ''
							data.chargeMoveEmoji = this.GameData.moves[data.move_2] && this.GameData.moves[data.move_2].type ? translator.translate(this.emojiLookup.lookup(this.GameData.utilData.types[this.GameData.moves[data.move_2].type].emoji, platform)) : ''
							data.gameWeatherName = data.weather ? translator.translate(data.gameWeatherNameEng) : ''
							data.gameWeatherEmoji = data.weather ? translator.translate(this.emojiLookup.lookup(this.GameData.utilData.weather[data.weather].emoji, platform)) : ''
							data.shinyPossibleEmoji = data.shinyPossible ? translator.translate(this.emojiLookup.lookup('shiny', platform)) : ''
							data.generationName = translator.translate(data.generationNameEng)

							data.quickMove = data.quickMoveName // deprecated
							data.chargeMove = data.chargeMoveName // deprecated
							data.move1 = data.quickMoveName // deprecated
							data.move2 = data.chargeMoveName // deprecated
							data.move1emoji = data.quickMoveEmoji // deprecated
							data.move2emoji = data.chargeMoveEmoji // deprecated

							const e = []
							const n = []
							monster.types.forEach((type) => {
								e.push(this.emojiLookup.lookup(this.GameData.utilData.types[type.name].emoji, platform))
								n.push(type.name)
							})
							data.typeNameEng = n
							data.emoji = e

							data.typeName = data.typeNameEng.map((type) => translator.translate(type))
								.join(', ')
							data.typeEmoji = data.emoji.map((emoji) => translator.translate(emoji))
								.join('')

							data.boostingWeathers = data.types.map((type) => parseInt(Object.keys(this.GameData.utilData.weatherTypeBoost)
								.find((key) => this.GameData.utilData.weatherTypeBoost[key].includes(type)), 10))
							data.boostingWeathersEmoji = data.boostingWeathers.map((weather) => translator.translate(this.emojiLookup.lookup(this.GameData.utilData.weather[weather].emoji, platform))).join('')
							data.boosted = !!data.boostingWeathers.includes(data.weather)
							data.boostWeatherNameEng = data.boosted ? this.GameData.utilData.weather[data.weather].name : ''
							data.boostWeatherId = data.boosted ? data.weather : ''
							data.boostWeatherName = data.boosted ? translator.translate(this.GameData.utilData.weather[data.weather].name) : ''
							data.boostWeatherEmoji = data.boosted ? translator.translate(this.emojiLookup.lookup(this.GameData.utilData.weather[data.weather].emoji, platform)) : ''

							require('./common/evolutionCalculator').setEvolutions(data, this.GameData, this.log, logReference, translator, this.emojiLookup, platform, monster)
							require('./common/weather').setNextWeatherText(data, translator, this.GameData, this.emojiLookup, platform)

							/* Weakness calculations */

							const typeInfo = this.GameData.types
							const typeData = this.GameData.utilData.types

							const strengths = {}
							const weaknesses = {}

							for (const type of data.typeNameEng) {
								strengths[type] = []
								typeInfo[type].strengths.forEach((x) => {
									strengths[type].push(x.typeName)
								})
								typeInfo[type].weaknesses.forEach((x) => {
									if (!weaknesses[x.typeName]) weaknesses[x.typeName] = 1
									weaknesses[x.typeName] *= 2
								})
								typeInfo[type].resistances.forEach((x) => {
									if (!weaknesses[x.typeName]) weaknesses[x.typeName] = 1
									weaknesses[x.typeName] *= 0.5
								})
								typeInfo[type].immunes.forEach((x) => {
									if (!weaknesses[x.typeName]) weaknesses[x.typeName] = 1
									weaknesses[x.typeName] *= 0.25
								})
							}

							const typeObj = {
								extraWeak: { value: 4, types: [], text: 'Very vulnerable to' },
								weak: { value: 2, types: [], text: 'Vulnerable to' },
								resist: { value: 0.5, types: [], text: 'Resistant to' },
								immune: { value: 0.25, types: [], text: 'Very resistant to' },
								extraImmune: { value: 0.125, types: [], text: 'Extremely resistant to' },
							}

							for (const [name, value] of Object.entries(weaknesses)) {
								const translated = {
									nameEng: name,
									name: translator.translate(name),
									emoji: translator.translate(this.emojiLookup.lookup(typeData[name].emoji, platform)),
								}
								switch (value) {
									case 0.125: typeObj.extraImmune.types.push(translated); break
									case 0.25: typeObj.immune.types.push(translated); break
									case 0.5: typeObj.resist.types.push(translated); break
									case 2: typeObj.weak.types.push(translated); break
									case 4: typeObj.extraWeak.types.push(translated); break
									default: break
								}
							}

							let weaknessEmoji = ''
							for (const info of Object.values(typeObj)) {
								if (info.types.length) {
									const typeEmoji = info.types.map((x) => x.emoji).join('')
									info.typeEmoji = typeEmoji
									weaknessEmoji = weaknessEmoji.concat(`${info.value}x${typeEmoji} `)
								}
							}

							data.weaknessList = Object.values(typeObj).filter((x) => x.types.length)

							data.weaknessEmoji = weaknessEmoji

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
								nowISO: new Date().toISOString(),
								genderData: {
									name: translator.translate(data.genderDataEng.name),
									emoji: translator.translate(this.emojiLookup.lookup(data.genderDataEng.emoji, platform)),
								},
								areas: data.matchedAreas.filter((area) => area.displayInMatches)
									.map((area) => area.name)
									.join(', '),
							}

							const templateType = 'raid'
							const message = await this.createMessage(logReference, templateType, platform, cares.template, language, cares.ping, view)

							const work = {
								lat: data.latitude.toString()
									.substring(0, 8),
								lon: data.longitude.toString()
									.substring(0, 8),
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
						this.log.error(`${data.gym_id}: Can't seem to handle raid (user cared): `, e, data)
					}
				})
				return []
			}

			data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true)
			const hatchTime = moment(data.start * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString())
			data.hatchTime = hatchTime.format(this.config.locale.time)
			data.hatchtime = data.hatchTime // deprecated

			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				this.log.debug(`${logReference}: Egg at ${data.gymName} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			const whoCares = data.poracleTest ? [{
				...data.poracleTest,
				clean: false,
				ping: '',
			}] : await this.eggWhoCares(data)

			if (whoCares.length) {
				this.log.info(`${logReference}: Egg level ${data.level} on ${data.gymName} appeared at [${data.latitude.toFixed(3)},${data.longitude.toFixed(3)}] in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Egg level ${data.level} on ${data.gymName} appeared at [${data.latitude.toFixed(3)},${data.longitude.toFixed(3)}] in areas (${data.matched}) and ${whoCares.length} humans cared.`)
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

			setImmediate(async () => {
				try {
					if (this.imgUicons) data.imgUrl = await this.imgUicons.eggIcon(data.level) || this.config.fallbacks?.imgUrlEgg
					if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.eggIcon(data.level) || this.config.fallbacks?.imgUrlEgg
					if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.eggIcon(data.level)

					const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
					const jobs = []

					require('./common/nightTime').setNightTime(data, hatchTime, this.config)

					await this.getStaticMapUrl(logReference, data, 'raid', ['latitude', 'longitude', 'level', 'imgUrl'])
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
						let [platform] = cares.type.split(':')
						if (platform === 'webhook') platform = 'discord'

						data.teamNameEng = data.team_id ? this.GameData.utilData.teams[data.team_id].name : 'Harmony'
						data.teamName = translator.translate(data.teamNameEng)
						data.teamEmoji = data.team_id !== undefined ? this.emojiLookup.lookup(this.GameData.utilData.teams[data.team_id].emoji, platform) : ''
						data.gameWeatherName = data.weather ? translator.translate(data.gameWeatherNameEng) : ''
						data.gameWeatherEmoji = data.weather ? translator.translate(this.emojiLookup.lookup(this.GameData.utilData.weather[data.weather].emoji, platform)) : ''
						data.levelName = translator.translateFormat(data.levelNameEng)

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
							nowISO: new Date().toISOString(),
							areas: data.matchedAreas.filter((area) => area.displayInMatches).map((area) => area.name).join(', '),
						}

						const templateType = 'egg'
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
					this.log.error(`${data.gym_id}: Can't seem to handle raid (user cared): `, e, data)
				}
			})

			return []
		} catch (e) {
			this.log.error(`${data.gym_id}: Can't seem to handle raid: `, e, data)
		}
	}
}

module.exports = Raid
