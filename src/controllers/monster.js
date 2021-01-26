const pokemonGif = require('pokemon-gif')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const { S2 } = require('s2-geometry')
const Controller = require('./controller')
const { log } = require('../lib/logger')
require('moment-precise-range-plugin')

class Monster extends Controller {
	getAlteringWeathers(types, boostStatus) {
		const boostingWeathers = types.map((type) => parseInt(Object.keys(this.utilData.weatherTypeBoost).find((key) => this.utilData.weatherTypeBoost[key].includes(type)), 10))
		const nonBoostingWeathers = [1, 2, 3, 4, 5, 6, 7].filter((weather) => !boostingWeathers.includes(weather))
		if (boostStatus > 0) return nonBoostingWeathers
		return boostingWeathers
	}

	async monsterWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let pokemonQueryString = `(pokemon_id=${data.pokemon_id} or pokemon_id=0) and (form = 0 or form = ${data.form})`
		if (data.pvpEvoLookup) pokemonQueryString = `(pokemon_id=${data.pvp_pokemon_id} and (form = 0 or form = ${data.pvp_form}) and (great_league_ranking < 4096 or ultra_league_ranking < 4096 or great_league_ranking_min_cp > 0 or ultra_league_ranking_min_cp > 0))`
		let pvpQueryString = `great_league_ranking>=${data.bestGreatLeagueRank} and great_league_ranking_min_cp<=${data.bestGreatLeagueRankCP} and ultra_league_ranking>=${data.bestUltraLeagueRank} and ultra_league_ranking_min_cp<=${data.bestUltraLeagueRankCP}`
		if (data.pvpEvoLookup) pvpQueryString = `great_league_ranking>=${data.pvp_bestGreatLeagueRank} and great_league_ranking_min_cp<=${data.pvp_bestGreatLeagueRankCP} and ultra_league_ranking>=${data.pvp_bestUltraLeagueRank} and ultra_league_ranking_min_cp<=${data.pvp_bestUltraLeagueRankCP}`
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking from monsters
		join humans on humans.id = monsters.id
		where humans.enabled = true and
		(${pokemonQueryString}) and
		min_iv<=${data.iv} and
		max_iv>=${data.iv} and
		min_cp<=${data.cp} and
		max_cp>=${data.cp} and
		(gender = ${data.gender} or gender = 0) and
		min_level<=${data.pokemon_level} and
		max_level>=${data.pokemon_level} and
		atk<=${data.individual_attack} and
		def<=${data.individual_defense} and
		sta<=${data.individual_stamina} and
		max_atk>=${data.individual_attack} and
		max_def>=${data.individual_defense} and
		max_sta>=${data.individual_stamina} and
		min_weight<=${data.weight} * 1000 and
		max_weight>=${data.weight} * 1000 and
		(${pvpQueryString})
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
					) < monsters.distance and monsters.distance != 0)
					or
					(
						monsters.distance = 0 and (${areastring})
					)
				)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking
				`)
		} else {
			query = query.concat(`
					and ((monsters.distance = 0 and (${areastring})) or monsters.distance > 0)
					group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking
					`)
		}
		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => +res.distance === 0 || +res.distance > 0 && +res.distance > this.getDistance({
				lat: res.latitude,
				lon: res.longitude,
			}, { lat: data.latitude, lon: data.longitude }))
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
		const tracer = Math.floor((Math.random() * 100) * 1000)
		let pregenerateTile = false
		const data = obj
		try {
			let hrstart = process.hrtime()

			moment.locale(this.config.locale.timeformat)
			const minTth = this.config.general.alertMinimumTime || 0

			switch (this.config.geocoding.staticProvider.toLowerCase()) {
				case 'poracle': {
					data.staticmap = `https://tiles.poracle.world/static/${this.config.geocoding.type}/${+data.latitude.toFixed(5)}/${+data.longitude.toFixed(5)}/${this.config.geocoding.zoom}/${this.config.geocoding.width}/${this.config.geocoding.height}/${this.config.geocoding.scale}/png`
					break
				}
				case 'tileservercache': {
					pregenerateTile = true
					break
				}
				case 'google': {
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${this.config.geocoding.type}&zoom=${this.config.geocoding.zoom}&size=${this.config.geocoding.width}x${this.config.geocoding.height}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'osm': {
					data.staticmap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${this.config.geocoding.width},${this.config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${this.config.geocoding.zoom}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'mapbox': {
					data.staticmap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${this.config.geocoding.zoom},0,0/${this.config.geocoding.width}x${this.config.geocoding.height}?access_token=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				default: {
					data.staticmap = ''
				}
			}
			if (data.form === undefined || data.form === null) data.form = 0
			const monster = this.monsterData[`${data.pokemon_id}_${data.form}`] ? this.monsterData[`${data.pokemon_id}_${data.form}`] : this.monsterData[`${data.pokemon_id}_0`]

			if (!monster) {
				log.warn('Couldn\'t find monster in:', data)
				return
			}

			const weatherCellKey = S2.latLngToKey(data.latitude, data.longitude, 10)
			const weatherCellId = S2.keyToId(weatherCellKey)
			const nowTimestamp = Math.floor(Date.now() / 1000)
			const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
			const previousHourTimestamp = currentHourTimestamp - 3600
			const nextHourTimestamp = currentHourTimestamp + 3600
			if (!(weatherCellId in this.weatherController.controllerData)) {
				this.weatherController.controllerData[weatherCellId] = {}
			}
			const weatherCellData = this.weatherController.controllerData[weatherCellId]
			let currentCellWeather = null

			if (nowTimestamp > (currentHourTimestamp + 30) && (this.config.weather.weatherChangeAlert || this.config.weather.enableWeatherForecast) && data.weather) {
				if (!weatherCellData.weatherFromBoost) weatherCellData.weatherFromBoost = [0, 0, 0, 0, 0, 0, 0, 0]
				if (!weatherCellData.lastCurrentWeatherCheck) weatherCellData.lastCurrentWeatherCheck = previousHourTimestamp
				if (data.weather == weatherCellData[currentHourTimestamp] && weatherCellData.lastCurrentWeatherCheck >= currentHourTimestamp) {
					weatherCellData.weatherFromBoost = [0, 0, 0, 0, 0, 0, 0, 0]
				}
				if (data.weather !== weatherCellData[currentHourTimestamp] || data.weather == weatherCellData[currentHourTimestamp] && weatherCellData.lastCurrentWeatherCheck < currentHourTimestamp) {
					weatherCellData.weatherFromBoost = weatherCellData.weatherFromBoost.map((value, index) => { if (index == data.weather) return value += 1; return value -= 1 })
					if (weatherCellData.weatherFromBoost.filter((x) => x > 4).length) {
						if (weatherCellData.weatherFromBoost.indexOf(5) == -1) weatherCellData.weatherFromBoost = [0, 0, 0, 0, 0, 0, 0, 0]
						this.log.info(`Boosted Pokémon! Force update of weather in cell ${weatherCellId} with weather ${data.weather}`)
						if (data.weather != weatherCellData[currentHourTimestamp]) weatherCellData.forecastTimeout = null
						weatherCellData[currentHourTimestamp] = data.weather
						currentCellWeather = data.weather
						// Delete old weather information
						Object.entries(weatherCellData).forEach(([timestamp]) => {
							if (timestamp < (currentHourTimestamp - 3600)) {
								delete weatherCellData[timestamp]
							}
						})
						// Remove users not caring about anything anymore
						if (weatherCellData.cares) weatherCellData.cares = weatherCellData.cares.filter((caring) => caring.caresUntil > nowTimestamp)
						if (!weatherCellData.cares || !weatherCellData[previousHourTimestamp] || weatherCellData[previousHourTimestamp] && currentCellWeather == weatherCellData[previousHourTimestamp]) weatherCellData.lastCurrentWeatherCheck = currentHourTimestamp
					}
				}
			}

			let weatherChangeAlertJobs = []
			if (this.config.weather.weatherChangeAlert && weatherCellData.cares && weatherCellData.lastCurrentWeatherCheck < currentHourTimestamp && weatherCellData[previousHourTimestamp] > 0 && currentCellWeather > 0 && weatherCellData[previousHourTimestamp] != currentCellWeather) {
				// this.log.error(`[DEBUG MONSTER] Start of handle tracing : [${tracer}]`)
				// this.log.error('[DEBUG MONSTER] ['+tracer+'] conditions met to alert on weather change in cell '+weatherCellId)
				const weatherDataPayload = {
					longitude: data.longitude,
					latitude: data.latitude,
					s2_cell_id: weatherCellId,
					gameplay_condition: data.weather,
					updated: nowTimestamp,
					source: 'fromMonster',
					trace: tracer,
				}
				weatherChangeAlertJobs = await this.weatherController.handle(weatherDataPayload) || null
				// this.log.error('[DEBUG MONSTER] ['+tracer+'] users caring about weather change in that cell :', weatherChangeAlertJobs)
			}

			if (this.config.weather.weatherChangeAlert && this.config.weather.showAlteredPokemon && weatherCellData.cares) {
				// delete despawned
				for (const cares of weatherCellData.cares) {
					if ('caredPokemons' in cares) cares.caredPokemons = cares.caredPokemons.filter((pokemon) => pokemon.disappear_time > nowTimestamp)
				}
			}

			if (!currentCellWeather && weatherCellData.lastCurrentWeatherCheck >= currentHourTimestamp) currentCellWeather = weatherCellData[currentHourTimestamp]

			const encountered = !(!(['string', 'number'].includes(typeof data.individual_attack) && (+data.individual_attack + 1))
				|| !(['string', 'number'].includes(typeof data.individual_defense) && (+data.individual_defense + 1))
				|| !(['string', 'number'].includes(typeof data.individual_stamina) && (+data.individual_stamina + 1)))

			data.iv = encountered ? ((data.individual_attack + data.individual_defense + data.individual_stamina) / 0.45).toFixed(2) : -1
			data.individual_attack = encountered ? data.individual_attack : 0
			data.individual_defense = encountered ? data.individual_defense : 0
			data.individual_stamina = encountered ? data.individual_stamina : 0
			data.cp = encountered ? data.cp : 0
			data.pokemon_level = encountered ? data.pokemon_level : 0
			data.move_1 = encountered ? data.move_1 : 0
			data.move_2 = encountered ? data.move_2 : 0
			data.weight = encountered ? data.weight.toFixed(1) : 0
			if (data.boosted_weather) data.weather = data.boosted_weather
			if (!data.weather) data.weather = 0
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.color = monster.types[0].color
			data.ivcolor = this.findIvColor(data.iv)
			data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true)
			data.distime = moment(data.disappear_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.gif = pokemonGif(Number(data.pokemon_id))
			data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.png`
			data.stickerUrl = `${this.config.general.stickerUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.webp`

			data.pvp_pokemon_id = data.pokemon_id
			data.pvp_form = data.form
			data.pvpEvolutionData = {}

			data.bestGreatLeagueRank = 4096
			data.bestGreatLeagueRankCP = 0
			if (data.pvp_rankings_great_league) {
				for (const stats of data.pvp_rankings_great_league) {
					if (stats.rank && stats.rank < data.bestGreatLeagueRank) {
						data.bestGreatLeagueRank = stats.rank
						data.bestGreatLeagueRankCP = stats.cp || 0
					} else if (stats.rank && stats.cp && stats.rank === data.bestGreatLeagueRank && stats.cp > data.bestGreatLeagueRankCP) {
						data.bestGreatLeagueRankCP = stats.cp
					}
					if (this.config.pvp.pvpEvolutionDirectTracking && stats.rank && stats.cp && stats.pokemon != data.pokemon_id && stats.rank <= this.config.pvp.pvpFilterMaxRank && stats.cp >= this.config.pvp.pvpFilterGreatMinCP) {
						if (data.pvpEvolutionData[stats.pokemon]) {
							data.pvpEvolutionData[stats.pokemon].greatLeague = {
								rank: stats.rank,
								percentage: stats.percentage,
								pokemon: stats.pokemon,
								form: stats.form,
								level: stats.level,
								cp: stats.cp,
							}
						} else {
							data.pvpEvolutionData[stats.pokemon] = {
								greatLeague: {
									rank: stats.rank,
									percentage: stats.percentage,
									pokemon: stats.pokemon,
									form: stats.form,
									level: stats.level,
									cp: stats.cp,
								},
							}
						}
					}
				}
			}

			data.bestUltraLeagueRank = 4096
			data.bestUltraLeagueRankCP = 0
			if (data.pvp_rankings_ultra_league) {
				for (const stats of data.pvp_rankings_ultra_league) {
					if (stats.rank && stats.rank < data.bestUltraLeagueRank) {
						data.bestUltraLeagueRank = stats.rank
						data.bestUltraLeagueRankCP = stats.cp || 0
					} else if (stats.rank && stats.cp && stats.rank === data.bestUltraLeagueRank && stats.cp > data.bestUltraLeagueRankCP) {
						data.bestUltraLeagueRankCP = stats.cp
					}
					if (this.config.pvp.pvpEvolutionDirectTracking && stats.rank && stats.cp && stats.pokemon != data.pokemon_id && stats.rank <= this.config.pvp.pvpFilterMaxRank && stats.cp >= this.config.pvp.pvpFilterUltraMinCP) {
						if (data.pvpEvolutionData[stats.pokemon]) {
							data.pvpEvolutionData[stats.pokemon].ultraLeague = {
								rank: stats.rank,
								percentage: stats.percentage,
								pokemon: stats.pokemon,
								form: stats.form,
								level: stats.level,
								cp: stats.cp,
							}
						} else {
							data.pvpEvolutionData[stats.pokemon] = {
								ultraLeague: {
									rank: stats.rank,
									percentage: stats.percentage,
									pokemon: stats.pokemon,
									form: stats.form,
									level: stats.level,
									cp: stats.cp,
								},
							}
						}
					}
				}
			}

			data.staticSprite = encodeURI(JSON.stringify([
				{
					url: data.imgUrl,
					height: this.config.geocoding.spriteHeight,
					width: this.config.geocoding.spriteWidth,
					x_offset: 0,
					y_offset: 0,
					latitude: +data.latitude,
					longitude: +data.longitude,
				},
			]))
			if (this.config.geocoding.staticProvider === 'poracle') {
				data.staticmap = `${data.staticmap}?markers=${data.staticSprite}`
			}
			// Stop handling if it already disappeared or is about to go away

			if ((data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) && !weatherChangeAlertJobs[0]) {
				log.debug(`${data.name} already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)

				return []
			}

			data.matched = await this.pointInArea([data.latitude, data.longitude])

			data.pvpEvoLookup = 0
			const whoCares = await this.monsterWhoCares(data)

			if (this.config.pvp.pvpEvolutionDirectTracking) {
				const pvpEvoData = data
				if (Object.keys(data.pvpEvolutionData).length !== 0) {
					for (const [key, pvpMon] of Object.entries(data.pvpEvolutionData)) {
						pvpEvoData.pvp_pokemon_id = key
						pvpEvoData.pvp_form = pvpMon.greatLeague ? pvpMon.greatLeague.form : pvpMon.ultraLeague.form
						pvpEvoData.pvp_bestGreatLeagueRank = pvpMon.greatLeague ? pvpMon.greatLeague.rank : 4096
						pvpEvoData.pvp_bestGreatLeagueRankCP = pvpMon.greatLeague ? pvpMon.greatLeague.cp : 0
						pvpEvoData.pvp_bestUltraLeagueRank = pvpMon.ultraLeague ? pvpMon.ultraLeague.rank : 4096
						pvpEvoData.pvp_bestUltraLeagueRankCP = pvpMon.ultraLeague ? pvpMon.ultraLeague.cp : 0
						pvpEvoData.pvpEvoLookup = 1
						const pvpWhoCares = await this.monsterWhoCares(pvpEvoData)
						if (pvpWhoCares[0]) {
							whoCares.push(...pvpWhoCares)
						}
					}
				}
			}

			let hrend = process.hrtime(hrstart)
			const hrendms = hrend[1] / 1000000
			this.log.info(`${monster.name} appeared and ${whoCares.length} humans cared. (${hrendms} ms)`)

			if (!whoCares[0] && !weatherChangeAlertJobs[0]) return []

			if (whoCares[0] && whoCares.length > 1 && this.config.pvp.pvpEvolutionDirectTracking) {
				const whoCaresNoDuplicates = whoCares.filter((v, i, a) => a.findIndex((t) => (t.id === v.id)) === i)
				whoCares.length = 0
				whoCares.push(...whoCaresNoDuplicates)
			}

			hrstart = process.hrtime()
			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				const { count } = this.getDiscordCache(cares.id)
				if (count <= this.config.discord.limitAmount + 1) discordCacheBad = false // but if anyone cares and has not exceeded cache, go on
			})

			if (discordCacheBad && !weatherChangeAlertJobs[0]) return []
			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile) {
				data.staticmap = await this.tileserverPregen.getPregeneratedTileURL('monster', data)
			}

			if (this.config.weather.enableWeatherForecast && data.disappear_time > nextHourTimestamp) {
				const weatherForecast = await this.weatherController.getWeather({ lat: +data.latitude, lon: +data.longitude, disappear: data.disappear_time })
				let pokemonShouldBeBoosted = false
				if (weatherForecast.current > 0 && this.utilData.weatherTypeBoost[weatherForecast.current].filter((boostedType) => data.types.includes(boostedType)).length > 0) pokemonShouldBeBoosted = true
				// this.log.error(`[DEBUG MONSTER] Tracing : [${tracer}]`)
				// this.log.error(`[DEBUG MONSTER] pokemon : ${data.name} (iv ${data.iv})`)
				// this.log.error(`[DEBUG MONSTER] pokemon types : ${data.types}`)
				// this.log.error(`[DEBUG MONSTER] weather forecast : ${weatherForecast.current} to ${weatherForecast.next}`)
				// this.log.error(`[DEBUG MONSTER] pokemonShouldBeBoosted : ${pokemonShouldBeBoosted}`)
				// this.log.error(`[DEBUG MONSTER] hasBoost : ${data.weather}`)
				if (weatherForecast.next > 0 && ((data.weather > 0 && weatherForecast.next !== data.weather) || (weatherForecast.current > 0 && weatherForecast.next !== weatherForecast.current) || (pokemonShouldBeBoosted && data.weather == 0))) {
					const weatherChangeTime = moment((data.disappear_time - (data.disappear_time % 3600)) * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time).slice(0, -3)
					const pokemonWillBeBoosted = this.utilData.weatherTypeBoost[weatherForecast.next].filter((boostedType) => data.types.includes(boostedType)).length > 0 ? 1 : 0
					// this.log.error(`[DEBUG MONSTER] pokemonWillBeBoosted : ${pokemonWillBeBoosted}`)
					if (data.weather > 0 && !pokemonWillBeBoosted || data.weather == 0 && pokemonWillBeBoosted) {
						// this.log.error(`[DEBUG MONSTER] conditions met for wheater change altering boost`)
						weatherForecast.current = data.weather > 0 ? data.weather : weatherForecast.current
						if (pokemonShouldBeBoosted && data.weather == 0) {
							// this.log.error(`[DEBUG MONSTER] something wrong with current weather info : ${weatherForecast.current} in cache`)
							data.weatherCurrent = 0
						} else {
							data.weatherCurrent = weatherForecast.current
						}
						data.weatherChangeTime = weatherChangeTime
						data.weatherNext = weatherForecast.next
					}
				}
			}

			for (const cares of whoCares) {
				const caresCache = this.getDiscordCache(cares.id).count

				if (this.config.weather.weatherChangeAlert && weatherCellData) {
					if (weatherCellData.cares) {
						let exists = false
						for (const caring of weatherCellData.cares) {
							if (caring.id === cares.id) {
								if (caring.caresUntil < data.disappear_time) {
									caring.caresUntil = data.disappear_time
								}
								exists = true
								break
							}
						}
						if (!exists) {
							weatherCellData.cares.push({
								id: cares.id, name: cares.name, type: cares.type, clean: cares.clean, caresUntil: data.disappear_time, template: cares.template, language: cares.language,
							})
						}
					} else {
						weatherCellData.cares = []
						weatherCellData.cares.push({
							id: cares.id, name: cares.name, type: cares.type, clean: cares.clean, caresUntil: data.disappear_time, template: cares.template, language: cares.language,
						})
					}
					if (this.config.weather.showAlteredPokemon && encountered) {
						for (const caring of weatherCellData.cares) {
							if (caring.id === cares.id) {
								if (!caring.caredPokemons) caring.caredPokemons = []
								caring.caredPokemons.push({
									pokemon_id: data.pokemon_id, form: data.form, name: data.name, formname: data.formname, iv: data.iv, cp: data.cp, latitude: data.latitude, longitude: data.longitude, disappear_time: data.disappear_time, alteringWeathers: data.alteringWeathers,
								})
							}
						}
					}
				}

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				data.name = translator.translate(monster.name)
				data.formname = translator.translate(monster.form.name)
				data.quickMove = data.weight && this.utilData.moves[data.move_1] ? translator.translate(this.utilData.moves[data.move_1].name) : ''
				data.chargeMove = data.weight && this.utilData.moves[data.move_2] ? translator.translate(this.utilData.moves[data.move_2].name) : ''
				data.move1emoji = this.utilData.moves[data.move_1] && this.utilData.types[this.utilData.moves[data.move_1].type] ? translator.translate(this.utilData.types[this.utilData.moves[data.move_1].type].emoji) : ''
				data.move2emoji = this.utilData.moves[data.move_2] && this.utilData.types[this.utilData.moves[data.move_2].type] ? translator.translate(this.utilData.types[this.utilData.moves[data.move_2].type].emoji) : ''
				data.boost = this.utilData.weather[data.weather] ? this.utilData.weather[data.weather].name : ''
				data.boostemoji = this.utilData.weather[data.weather] ? translator.translate(this.utilData.weather[data.weather].emoji) : ''
				data.gameweather = this.utilData.weather[currentCellWeather] ? this.utilData.weather[currentCellWeather].name : ''
				data.gameweatheremoji = this.utilData.weather[currentCellWeather] ? translator.translate(this.utilData.weather[currentCellWeather].emoji) : ''
				if (data.weatherNext) {
					if (!data.weatherCurrent) {
						data.weatherChange = `⚠️ ${translator.translate('Possible weather change at')} ${data.weatherChangeTime} : ➡️ ${translator.translate(this.utilData.weather[data.weatherNext].name)} ${translator.translate(this.utilData.weather[data.weatherNext].emoji)}`
						data.weatherCurrentName = translator.translate('unknown')
						data.weatherCurrentEmoji = '❓'
					} else {
						data.weatherChange = `⚠️ ${translator.translate('Possible weather change at')} ${data.weatherChangeTime} : ${translator.translate(this.utilData.weather[data.weatherCurrent].name)} ${translator.translate(this.utilData.weather[data.weatherCurrent].emoji)} ➡️ ${translator.translate(this.utilData.weather[data.weatherNext].name)} ${translator.translate(this.utilData.weather[data.weatherNext].emoji)}`
						data.weatherCurrentName = translator.translate(this.utilData.weather[data.weatherCurrent].name)
						data.weatherCurrentEmoji = translator.translate(this.utilData.weather[data.weatherCurrent].emoji)
					}
					data.weatherNextName = translator.translate(this.utilData.weather[data.weatherNext].name)
					data.weatherNextEmoji = translator.translate(this.utilData.weather[data.weatherNext].emoji)
				}

				const e = []
				monster.types.forEach((type) => {
					e.push(translator.translate(this.utilData.types[type.name].emoji))
				})
				data.emoji = e
				data.emojiString = e.join('')

				const view = {
					...geoResult,
					...data,
					id: data.pokemon_id,
					baseStats: monster.stats,
					time: data.distime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					name: data.name,
					now: new Date(),
					genderData: this.utilData.genders[data.gender],
					level: Math.round(data.pokemon_level),
					atk: data.individual_attack,
					def: data.individual_defense,
					sta: data.individual_stamina,
					imgUrl: data.imgUrl,
					greatleagueranking: cares.great_league_ranking === 4096 ? 0 : cares.great_league_ranking,
					ultraleagueranking: cares.ultra_league_ranking === 4096 ? 0 : cares.ultra_league_ranking,
					// pokemoji: emojiData.pokemon[data.pokemon_id],
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
					pvpDisplayMaxRank: this.config.pvp.pvpDisplayMaxRank,
					pvpDisplayGreatMinCP: this.config.pvp.pvpDisplayGreatMinCP,
					pvpDisplayUltraMinCP: this.config.pvp.pvpDisplayUltraMinCP,
				}

				let [platform] = cares.type.split(':')
				if (platform == 'webhook') platform = 'discord'

				const mustache = this.getDts((data.iv === -1) ? 'monsterNoIv' : 'monster', platform, cares.template, language)
				if (mustache) {
					const message = JSON.parse(mustache(view, { data: { language } }))

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
						message: caresCache === this.config.discord.limitAmount + 1 ? { content: `You have reached the limit of ${this.config.discord.limitAmount} messages over ${this.config.discord.limitSec} seconds` } : message,
						target: cares.id,
						type: cares.type,
						name: cares.name,
						tth: data.tth,
						clean: cares.clean,
						emoji: caresCache === this.config.discord.limitAmount + 1 ? [] : data.emoji,
					}
					if (caresCache <= this.config.discord.limitAmount + 1) {
						jobs.push(work)
						this.addDiscordCache(cares.id)
					}
				}
			}
			hrend = process.hrtime(hrstart)
			const hrendprocessing = hrend[1] / 1000000
			this.log.info(`${monster.name} appeared and ${whoCares.length} humans cared [end]. (${hrendms} ms sql ${hrendprocessing} ms processing dts)`)

			// this.log.error(`[DEBUG MONSTER] Tracing : [${tracer}]`)
			// this.log.error('[DEBUG MONSTER] users caring about weather :', weatherChangeAlertJobs)
			// this.log.error('[DEBUG MONSTER] users caring about pokemon :', jobs)
			if (weatherChangeAlertJobs[0]) weatherChangeAlertJobs.forEach((weatherJob) => jobs.push(weatherJob))
			// this.log.error('[DEBUG MONSTER] user alerts :', jobs)

			return jobs
		} catch (e) {
			this.log.error('Can\'t seem to handle monster: ', e, data)
		}
	}
}

module.exports = Monster
