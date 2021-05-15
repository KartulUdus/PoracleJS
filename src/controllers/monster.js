const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')
require('moment-precise-range-plugin')

class Monster extends Controller {
	getAlteringWeathers(types, boostStatus) {
		const boostingWeathers = types.map((type) => parseInt(Object.keys(this.GameData.utilData.weatherTypeBoost).find((key) => this.GameData.utilData.weatherTypeBoost[key].includes(type)), 10))
		const nonBoostingWeathers = [1, 2, 3, 4, 5, 6, 7].filter((weather) => !boostingWeathers.includes(weather))
		if (boostStatus > 0) return nonBoostingWeathers
		return boostingWeathers
	}

	async monsterWhoCares(data) {
		let areastring = '1 = 0 '// `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let strictareastring = ''
		if (this.config.areaSecurity.enabled && this.config.areaSecurity.strictLocations) {
			strictareastring = 'and (humans.area_restriction IS NULL OR (1 = 0 '
			data.matched.forEach((area) => {
				strictareastring = strictareastring.concat(`or humans.area_restriction like '%"${area}"%' `)
			})
			strictareastring = strictareastring.concat('))')
		}
		let pokemonQueryString = `(pokemon_id=${data.pokemon_id} or pokemon_id=0) and (form = 0 or form = ${data.form})`
		if (data.pvpEvoLookup) pokemonQueryString = `(pokemon_id=${data.pvpPokemonId} and (form = 0 or form = ${data.pvpFormId}) and (great_league_ranking < 4096 or ultra_league_ranking < 4096 or great_league_ranking_min_cp > 0 or ultra_league_ranking_min_cp > 0))`
		let pvpQueryString = `great_league_ranking>=${data.bestGreatLeagueRank} and great_league_ranking_min_cp<=${data.bestGreatLeagueRankCP} and ultra_league_ranking>=${data.bestUltraLeagueRank} and ultra_league_ranking_min_cp<=${data.bestUltraLeagueRankCP}`
		if (data.pvpEvoLookup) pvpQueryString = `great_league_ranking>=${data.pvp_bestGreatLeagueRank} and great_league_ranking_min_cp<=${data.pvp_bestGreatLeagueRankCP} and ultra_league_ranking>=${data.pvp_bestUltraLeagueRank} and ultra_league_ranking_min_cp<=${data.pvp_bestUltraLeagueRankCP}`
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking from monsters
		join humans on (humans.id = monsters.id and humans.current_profile_no = monsters.profile_no)
		where humans.enabled = true and humans.admin_disable = false and
		(${pokemonQueryString}) and
		min_iv<=${data.iv} and
		max_iv>=${data.iv} and
		min_time<=${data.tthSeconds} and
		min_cp<=${data.cp} and
		max_cp>=${data.cp} and
		(gender = ${data.gender} or gender = 0) and
		min_level<=${data.level} and
		max_level>=${data.level} and
		atk<=${data.atk} and
		def<=${data.def} and
		sta<=${data.sta} and
		max_atk>=${data.atk} and
		max_def>=${data.def} and
		max_sta>=${data.sta} and
		min_weight<=${data.weight * 1000} and
		max_weight>=${data.weight * 1000} and
		rarity<=${data.rarityGroup} and
		max_rarity>=${data.rarityGroup} and
		(${pvpQueryString})
		${strictareastring}
		`

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
				and
				(
					(	
						monsters.distance != 0 and
						round(
							6371000	* acos(
								cos( radians(${data.latitude}) )
								* cos( radians( humans.latitude ) )
								* cos( radians( humans.longitude ) - radians(${data.longitude}) )
								+ sin( radians(${data.latitude}) )
								* sin( radians( humans.latitude ) )
							)
						) < monsters.distance
					)
					or
					(
						monsters.distance = 0 and (${areastring})
					)
				)
				`)
			//				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking
		} else {
			query = query.concat(`
					and ((monsters.distance = 0 and (${areastring})) or monsters.distance > 0)
					`)
			//					group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking
		}
		// this.log.silly(`${data.encounter_id}: Query ${query}`)

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
		let pregenerateTile = false
		const data = obj
		try {
			let hrstart = process.hrtime()
			const logReference = data.encounter_id

			const minTth = this.config.general.alertMinimumTime || 0

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
			if (data.form === undefined || data.form === null) data.form = 0
			const monster = this.GameData.monsters[`${data.pokemon_id}_${data.form}`] ? this.GameData.monsters[`${data.pokemon_id}_${data.form}`] : this.GameData.monsters[`${data.pokemon_id}_0`]

			if (!monster) {
				this.log.warn(`${data.encounter_id}: Couldn't find monster in:`, data)
				return
			}

			const weatherCellId = this.weatherData.getWeatherCellId(data.latitude, data.longitude)

			if (data.weather) {
				this.weatherData.checkWeatherOnMonster(weatherCellId, data.latitude, data.longitude, data.weather)
			}

			// Get current cell weather from cache
			const currentCellWeather = this.weatherData.getCurrentWeatherInCell(weatherCellId)

			const encountered = !(!(['string', 'number'].includes(typeof data.individual_attack) && (+data.individual_attack + 1))
				|| !(['string', 'number'].includes(typeof data.individual_defense) && (+data.individual_defense + 1))
				|| !(['string', 'number'].includes(typeof data.individual_stamina) && (+data.individual_stamina + 1)))

			if (data.fort_name) data.fort_name = this.escapeJsonString(data.fort_name)
			data.pokemonId = data.pokemon_id
			data.encounterId = data.encounter_id
			// eslint-disable-next-line prefer-destructuring
			data.generation = Object.entries(this.GameData.utilData.genData).find(([, genData]) => data.pokemonId >= genData.min && data.pokemonId <= genData.max)[0]
			data.nameEng = monster.name
			data.formNameEng = monster.form.name
			data.formId = data.form
			data.iv = encountered ? ((data.individual_attack + data.individual_defense + data.individual_stamina) / 0.45).toFixed(2) : -1
			data.atk = encountered ? data.individual_attack : 0
			data.def = encountered ? data.individual_defense : 0
			data.sta = encountered ? data.individual_stamina : 0
			if (data.base_catch) data.capture_1 = data.base_catch
			if (data.great_catch) data.capture_2 = data.great_catch
			if (data.ultra_catch) data.capture_3 = data.ultra_catch
			if (data.verified) data.disappear_time_verified = data.verified
			data.catchBase = encountered ? (data.capture_1 * 100).toFixed(2) : 0
			data.catchGreat = encountered ? (data.capture_2 * 100).toFixed(2) : 0
			data.catchUltra = encountered ? (data.capture_3 * 100).toFixed(2) : 0
			data.cp = encountered ? data.cp : 0
			data.level = encountered ? data.pokemon_level : 0
			data.quickMoveId = encountered ? data.move_1 : 0
			data.chargeMoveId = encountered ? data.move_2 : 0
			data.quickMoveNameEng = encountered && this.GameData.moves[data.quickMoveId] ? this.GameData.moves[data.quickMoveId].name : ''
			data.chargeMoveNameEng = encountered && this.GameData.moves[data.chargeMoveId] ? this.GameData.moves[data.chargeMoveId].name : ''
			data.height = encountered && data.height ? data.height.toFixed(2) : 0
			data.weight = encountered && data.weight ? data.weight.toFixed(2) : 0
			data.genderDataEng = this.GameData.utilData.genders[data.gender]
			if (data.boosted_weather) data.weather = data.boosted_weather
			if (!data.weather) data.weather = 0
			data.appleMapUrl = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			data.color = this.GameData.utilData.types[monster.types[0].name].color
			data.ivColor = this.findIvColor(data.iv)
			data.tthSeconds = data.disappear_time - Date.now() / 1000
			data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true)
			data.disappearTime = moment(data.disappear_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.confirmedTime = data.disappear_time_verified
			data.distime = data.disappearTime // deprecated
			data.individual_attack = data.atk // deprecated
			data.individual_defense = data.def // deprecated
			data.individual_stamina = data.sta // deprecated
			data.pokemon_level = data.level // deprecated
			data.move_1 = data.quickMoveId // deprecated
			data.move_2 = data.chargeMoveId // deprecated
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.ivcolor = data.ivColor // deprecated
			//			data.gif = pokemonGif(Number(data.pokemon_id)) // deprecated
			data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.png`
			data.stickerUrl = `${this.config.general.stickerUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.webp`
			data.types = this.getPokemonTypes(data.pokemon_id, data.form)
			data.alteringWeathers = this.getAlteringWeathers(data.types, data.weather)
			data.rarityGroup = Object.keys(this.statsData.rarityGroups).find((x) => this.statsData.rarityGroups[x].includes(data.pokemonId)) || -1
			data.rarityNameEng = this.GameData.utilData.rarity[data.rarityGroup] ? this.GameData.utilData.rarity[data.rarityGroup] : ''
			data.pvpPokemonId = data.pokemon_id
			data.pvpFormId = data.form
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

			// Stop handling if it already disappeared or is about to go away
			if ((data.tth.firstDateWasLater || data.tthSeconds < minTth)) {
				this.log.verbose(`${data.encounter_id}: ${monster.name} already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matched = this.pointInArea([data.latitude, data.longitude])

			data.pvpEvoLookup = 0
			const whoCares = await this.monsterWhoCares(data)

			if (this.config.pvp.pvpEvolutionDirectTracking) {
				const pvpEvoData = data
				if (Object.keys(data.pvpEvolutionData).length !== 0) {
					for (const [key, pvpMon] of Object.entries(data.pvpEvolutionData)) {
						pvpEvoData.pvpPokemonId = key
						pvpEvoData.pvpFormId = pvpMon.greatLeague ? pvpMon.greatLeague.form : pvpMon.ultraLeague.form
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
			if (whoCares.length) {
				this.log.info(`${data.encounter_id}: ${monster.name} appeared in areas (${data.matched}) and ${whoCares.length} humans cared. (${hrendms} ms)`)
			} else {
				this.log.verbose(`${data.encounter_id}: ${monster.name} appeared in areas (${data.matched}) and ${whoCares.length} humans cared. (${hrendms} ms)`)
			}

			if (!whoCares.length) return []

			if (whoCares.length > 1 && this.config.pvp.pvpEvolutionDirectTracking) {
				const whoCaresNoDuplicates = whoCares.filter((v, i, a) => a.findIndex((t) => (t.id === v.id)) === i)
				whoCares.length = 0
				whoCares.push(...whoCaresNoDuplicates)
			}

			hrstart = process.hrtime()
			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating monster alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${this.getRateLimitTimeToRelease(cares.id)}`)
				})

				return []
			}

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile && this.config.geocoding.staticMapType.pokemon) {
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'monster', data, this.config.geocoding.staticMapType.pokemon)
			}
			data.staticmap = data.staticMap // deprecated

			// get Weather Forecast information

			const { nextHourTimestamp } = this.weatherData.getWeatherTimes()
			if (this.config.weather.enableWeatherForecast && data.disappear_time > nextHourTimestamp) {
				const weatherForecast = await this.weatherData.getWeatherForecast(weatherCellId)

				let pokemonShouldBeBoosted = false
				let pokemonWillBeBoosted = false
				const currentBoostedTypes = weatherForecast.current ? this.GameData.utilData.weatherTypeBoost[weatherForecast.current] : []
				const forecastBoostedTypes = weatherForecast.next ? this.GameData.utilData.weatherTypeBoost[weatherForecast.next] : []
				if (weatherForecast.current > 0 && currentBoostedTypes.filter((boostedType) => data.types.includes(boostedType)).length > 0) pokemonShouldBeBoosted = true
				if (weatherForecast.next > 0 && ((data.weather > 0 && weatherForecast.next !== data.weather) || (weatherForecast.current > 0 && weatherForecast.next !== weatherForecast.current) || (pokemonShouldBeBoosted && data.weather == 0))) {
					const weatherChangeTime = moment((data.disappear_time - (data.disappear_time % 3600)) * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time).slice(0, -3)
					pokemonWillBeBoosted = forecastBoostedTypes.filter((boostedType) => data.types.includes(boostedType)).length > 0 ? 1 : 0
					if (data.weather > 0 && !pokemonWillBeBoosted || data.weather == 0 && pokemonWillBeBoosted) {
						weatherForecast.current = data.weather > 0 ? data.weather : weatherForecast.current
						if (pokemonShouldBeBoosted && data.weather == 0) {
							data.weatherCurrent = 0
						} else {
							data.weatherCurrent = weatherForecast.current
						}
						data.weatherChangeTime = weatherChangeTime
						data.weatherNext = weatherForecast.next
					}
				}
				this.log.debug(`${logReference}: Pokemon ${data.pokemon_id} cell: ${weatherCellId} types ${JSON.stringify(data.types)} weather ${data.weather} Forecast ${weatherForecast.current} [boosted ${pokemonShouldBeBoosted} ${JSON.stringify(currentBoostedTypes)}] next ${weatherForecast.next} [boosted ${pokemonWillBeBoosted} ${JSON.stringify(forecastBoostedTypes)}]`)
			}

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating monster alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating monster alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating monster alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				if (this.config.weather.weatherChangeAlert) {
					// Emit event so we can tell weather controller (different worker) about the pokemon being monitored

					this.emit('userCares', {
						target: {
							id: cares.id,
							name: cares.name,
							type: cares.type,
							clean: cares.clean,
							ping: cares.ping,
							template: cares.template,
							language: cares.language,
						},
						weatherCellId,
						caresUntil: data.disappear_time,
						pokemon: encountered
							? {
								pokemon_id: data.pokemon_id,
								form: data.form,
								name: monster.name,
								formName: monster.form.name,
								iv: data.iv,
								cp: data.cp,
								latitude: data.latitude,
								longitude: data.longitude,
								disappear_time: data.disappear_time,
								alteringWeathers: data.alteringWeathers,
							} : null,

					})
				}

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				data.name = translator.translate(monster.name)
				data.formName = translator.translate(monster.form.name)
				data.genderData = {
					name: translator.translate(data.genderDataEng.name),
					emoji: translator.translate(data.genderDataEng.emoji),
				}
				data.rarityName = translator.translate(data.rarityNameEng)
				data.quickMoveName = data.weight && this.GameData.moves[data.quickMoveId] ? translator.translate(this.GameData.moves[data.quickMoveId].name) : ''
				data.quickMoveEmoji = this.GameData.moves[data.quickMoveId] && this.GameData.utilData.types[this.GameData.moves[data.quickMoveId].type] ? translator.translate(this.GameData.utilData.types[this.GameData.moves[data.quickMoveId].type].emoji) : ''
				data.chargeMoveName = data.weight && this.GameData.moves[data.chargeMoveId] ? translator.translate(this.GameData.moves[data.chargeMoveId].name) : ''
				data.chargeMoveEmoji = this.GameData.moves[data.chargeMoveId] && this.GameData.utilData.types[this.GameData.moves[data.chargeMoveId].type] ? translator.translate(this.GameData.utilData.types[this.GameData.moves[data.chargeMoveId].type].emoji) : ''
				data.boosted = !!data.weather
				data.boostWeatherId = data.weather ? data.weather : ''
				data.boostWeatherName = data.weather ? translator.translate(this.GameData.utilData.weather[data.weather].name) : ''
				data.boostWeatherEmoji = data.weather ? translator.translate(this.GameData.utilData.weather[data.weather].emoji) : ''
				data.gameWeatherId = this.GameData.utilData.weather[currentCellWeather] ? currentCellWeather : ''
				data.gameWeatherName = this.GameData.utilData.weather[currentCellWeather] ? translator.translate(this.GameData.utilData.weather[currentCellWeather].name) : ''
				data.gameWeatherEmoji = this.GameData.utilData.weather[currentCellWeather] ? translator.translate(this.GameData.utilData.weather[currentCellWeather].emoji) : ''
				data.formname = data.formName // deprecated
				data.quickMove = data.quickMoveName // deprecated
				data.chargeMove = data.chargeMoveName // deprecated
				data.move1emoji = data.quickMoveEmoji // deprecated
				data.move2emoji = data.chargeMoveEmoji // deprecated
				data.boost = data.boostWeatherName // deprecated
				data.boostemoji = data.boostWeatherEmoji // deprecated
				data.gameweather = data.gameWeatherName // deprecated
				data.gameweatheremoji = data.gameWeatherEmoji // deprecated
				if (data.weatherNext) {
					if (!data.weatherCurrent) {
						data.weatherChange = `⚠️ ${translator.translate('Possible weather change at')} ${data.weatherChangeTime} : ➡️ ${translator.translate(this.GameData.utilData.weather[data.weatherNext].name)} ${translator.translate(this.GameData.utilData.weather[data.weatherNext].emoji)}`
						data.weatherCurrentName = translator.translate('unknown')
						data.weatherCurrentEmoji = '❓'
					} else {
						data.weatherChange = `⚠️ ${translator.translate('Possible weather change at')} ${data.weatherChangeTime} : ${translator.translate(this.GameData.utilData.weather[data.weatherCurrent].name)} ${translator.translate(this.GameData.utilData.weather[data.weatherCurrent].emoji)} ➡️ ${translator.translate(this.GameData.utilData.weather[data.weatherNext].name)} ${translator.translate(this.GameData.utilData.weather[data.weatherNext].emoji)}`
						data.weatherCurrentName = translator.translate(this.GameData.utilData.weather[data.weatherCurrent].name)
						data.weatherCurrentEmoji = translator.translate(this.GameData.utilData.weather[data.weatherCurrent].emoji)
					}
					data.weatherNextName = translator.translate(this.GameData.utilData.weather[data.weatherNext].name)
					data.weatherNextEmoji = translator.translate(this.GameData.utilData.weather[data.weatherNext].emoji)
				}

				const e = []
				const n = []
				monster.types.forEach((type) => {
					e.push(translator.translate(this.GameData.utilData.types[type.name].emoji))
					n.push(type.name)
				})
				data.emoji = e
				data.typeNameEng = n
				data.typeName = data.typeNameEng.map((type) => translator.translate(type)).join(', ')
				data.emojiString = e.join('')

				const view = {
					...geoResult,
					...data,
					id: data.pokemon_id,
					baseStats: monster.stats,
					time: data.disappearTime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					now: new Date(),
					pvpUserRanking: Math.min(cares.great_league_ranking, cares.ultra_league_ranking) === 4096 ? 0 : Math.min(cares.great_league_ranking, cares.ultra_league_ranking),
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
					pvpDisplayMaxRank: this.config.pvp.pvpDisplayMaxRank,
					pvpDisplayGreatMinCP: this.config.pvp.pvpDisplayGreatMinCP,
					pvpDisplayUltraMinCP: this.config.pvp.pvpDisplayUltraMinCP,
				}

				let [platform] = cares.type.split(':')
				if (platform == 'webhook') platform = 'discord'

				const mustache = this.getDts(logReference, (data.iv === -1) ? 'monsterNoIv' : 'monster', platform, cares.template, language)
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
			hrend = process.hrtime(hrstart)
			const hrendprocessing = hrend[1] / 1000000
			this.log.debug(`${data.encounter_id}: ${monster.name} appeared and ${whoCares.length} humans cared [end]. (${hrendms} ms sql ${hrendprocessing} ms processing dts)`)

			return jobs
		} catch (e) {
			this.log.error(`${data.encounter_id}: Can't seem to handle monster: `, e, data)
		}
	}
}

module.exports = Monster
