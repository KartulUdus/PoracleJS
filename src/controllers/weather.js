const moment = require('moment-timezone')
const axios = require('axios')
const { S2 } = require('s2-geometry')
const S2ts = require('nodes2ts')
const path = require('path')
const pcache = require('flat-cache')
const { Mutex } = require('async-mutex')
const Controller = require('./controller')
require('moment-precise-range-plugin')

const weatherKeyCache = pcache.load('weatherKeyCache', path.resolve(`${__dirname}../../../.cache/`))
const weatherCache = pcache.load('weatherCache', path.resolve(`${__dirname}../../../.cache/`))

class Weather extends Controller {
	constructor(log, db, config, dts, geofence, GameData, discordCache, translatorFactory, mustache) {
		super(log, db, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, null)
		this.controllerData = weatherCache.getKey('weatherCacheData') || {}
		this.caresData = weatherCache.getKey('caredPokemon') || {}

		this.forecastBusy = false
		this.getWeatherMutex = {}
	}

	async getLaziestWeatherKey() {
		if (this.config.weather.apiKeyAccuWeather.length == 0) {
			this.log.error('no AccuWeather API key provided in config')
			return ''
		}

		const cacheKey = `${moment().year()}-${moment().month() + 1}-${moment().date()}`
		const cachedResult = weatherKeyCache.getKey(cacheKey)
		let keyToUse

		if (cachedResult) {
			// Using the first key that isn't in cache at all
			[keyToUse] = this.config.weather.apiKeyAccuWeather.filter((key) => !Object.keys(cachedResult).includes(key))
			// or find laziest key in cache
			if (!keyToUse) {
				let busyestKeyCount = Number.POSITIVE_INFINITY
				Object.keys(cachedResult).map((key) => {
					if (cachedResult[key] < busyestKeyCount) {
						busyestKeyCount = cachedResult[key]
						keyToUse = key
					}
				})
			}
			if (cachedResult[keyToUse] >= this.config.weather.apiKeyDayQuota) {
				this.log.error('no AccuWeather key available with free call to API for the day anymore')
				return ''
			}
			cachedResult[keyToUse] = cachedResult[keyToUse] ? cachedResult[keyToUse] + 1 : 1
			weatherKeyCache.setKey(cacheKey, cachedResult)
		} else {
			[keyToUse] = this.config.weather.apiKeyAccuWeather
			const toCache = {}
			toCache[keyToUse] = 1
			weatherKeyCache.setKey(cacheKey, toCache)
		}

		weatherKeyCache.save(true)

		return keyToUse
	}

	// eslint-disable-next-line class-methods-use-this
	async mapPoGoWeather(weatherIcon) {
		const mapping = {
			1: [1, 2, 30, 33, 34],
			2: [12, 15, 18, 26, 29],
			3: [3, 4, 14, 17, 21, 35, 36, 39, 41],
			4: [5, 6, 7, 8, 13, 16, 20, 23, 37, 38, 40, 42],
			5: [32],
			6: [19, 22, 24, 25, 31, 43, 44],
			7: [11],
		}
		for (const [index, map] of Object.entries(mapping)) {
			if (map.indexOf(weatherIcon) !== -1) {
				return parseInt(index, 10)
			}
		}
		return 0
	}

	// eslint-disable-next-line class-methods-use-this
	expireWeatherCell(weatherCell, currentHourTimestamp) {
		Object.entries(weatherCell).forEach(([timestamp]) => {
			if (timestamp < (currentHourTimestamp - 3600)) {
				delete weatherCell[timestamp]
			}
		})
	}

	/**
	 * Get weather forecast
	 * @param weatherObject
	 * @returns {Promise<{next: number, current: number}>}
	 */
	async getWeather(id) {
		// const res = {
		// 	current: 0,
		// 	next: 0,
		// }
		// // if (!this.config.weather.enableWeatherForecast
		// 	|| moment().hour() >= moment(weatherObject.disappear * 1000).hour()
		// 	&& !(moment().hour() == 23 && moment(weatherObject.disappear * 1000).hour() == 0)
		// ) {
		// 	this.log.info('weather forecast target will disappear in current hour')
		// 	return res
		// }
		//
		// const key = S2.latLngToKey(weatherObject.lat, weatherObject.lon, 10)
		// const id = S2.keyToId(key)

		this.log.debug(`Get weather ${id} before mutex`)
		let weatherMutex = this.getWeatherMutex[id]
		if (!weatherMutex) {
			weatherMutex = new Mutex()
			this.getWeatherMutex[id] = weatherMutex
		}
		return weatherMutex.runExclusive(async () => {
			this.log.debug(`Get weather ${id} obtained mutex mutex`)

			const nowTimestamp = Math.floor(Date.now() / 1000)
			const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
			const nextHourTimestamp = currentHourTimestamp + 3600
			let forecastTimeout = nowTimestamp + this.config.weather.forecastRefreshInterval * 3600

			if (this.config.weather.localFirstFetchHOD && !this.config.weather.smartForecast) {
				const currentMoment = moment(currentHourTimestamp * 1000)
				const currentHour = currentMoment.hour()
				// Weather must be refreshed at the time set in config with the interval given
				const localFirstFetchTOD = this.config.weather.localFirstFetchHOD
				const { forecastRefreshInterval } = this.config.weather
				// eslint-disable-next-line no-bitwise
				const nextUpdateHour = (((currentHour + ((currentHour % forecastRefreshInterval) < localFirstFetchTOD ? 0 : (forecastRefreshInterval - 1))) & -forecastRefreshInterval) + localFirstFetchTOD) % 24
				const nextUpdateInHours = (nextUpdateHour > currentHour ? nextUpdateHour : (24 + localFirstFetchTOD)) - currentHour
				forecastTimeout = currentMoment.add(nextUpdateInHours, 'hours').unix()
			}

			if (!this.controllerData[id]) this.controllerData[id] = {}
			const data = this.controllerData[id]

			data.lastForecastLoad = currentHourTimestamp	// Indicate we have tried a forecast

			if (!Object.keys(data).length || !data.location) {
				const latlng = S2.idToLatLng(id)
				const apiKeyWeatherLocation = await this.getLaziestWeatherKey()
				if (apiKeyWeatherLocation) {
					try {
						// Fetch location information
						const url = `https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKeyWeatherLocation}&q=${latlng.lat}%2C${latlng.lng}`
						this.log.debug(`${id}: Fetching AccuWeather location ${url}`)

						const weatherLocation = await axios.get(url)
						data.location = weatherLocation.data.Key
					} catch (err) {
						this.log.error(`${id}: Fetching AccuWeather location errored with: ${err}`)
						this.broadcastWeather()
						return
					}
				} else {
					this.log.info(`${id}: Couldn't fetch weather location - no API key available`)
					this.broadcastWeather()
					return
				}
			}

			if (!data[currentHourTimestamp]) {
				// Nothing to say about current weather
				data[currentHourTimestamp] = 0
			}

			if (!data[nextHourTimestamp]
					|| !data.forecastTimeout
					|| data.forecastTimeout <= currentHourTimestamp
			) {
				// Delete old weather information
				this.expireWeatherCell(data, currentHourTimestamp)

				const apiKeyWeatherInfo = await this.getLaziestWeatherKey()
				if (apiKeyWeatherInfo) {
					try {
						// Fetch new weather information
						const url = `https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${data.location}?apikey=${apiKeyWeatherInfo}`
						this.log.debug(`${id}: Fetching AccuWeather Forecast ${url}`)

						const weatherInfo = await axios.get(url)
						for (const forecast in Object.entries(weatherInfo.data)) {
							if (weatherInfo.data[forecast].EpochDateTime > currentHourTimestamp) {
								data[weatherInfo.data[forecast].EpochDateTime] = await this.mapPoGoWeather(weatherInfo.data[forecast].WeatherIcon)
							}
						}
						data.forecastTimeout = forecastTimeout
						data.lastCurrentWeatherCheck = currentHourTimestamp
					} catch (err) {
						this.log.error(`${id}: Fetching AccuWeather weather info errored with: ${err}`)
					}
				} else {
					this.log.warn(`${id}: Couldn't fetch weather forecast - no API key available`)
				}

				this.broadcastWeather()
				this.saveCache()
			} else {
				this.log.debug(`${id}: getWeather: No weather fetch is required`)
				this.broadcastWeather()
			}
		})
	}

	saveCache() {
		weatherCache.setKey('weatherCacheData', this.controllerData)
		weatherCache.setKey('caredPokemon', this.caresData)

		weatherCache.save(true)
	}

	broadcastWeather() {
		this.emit('weatherChanged', this.controllerData)
	}

	/**
	 * Handle weather incoming events
	 * @param obj
	 * @returns {Promise<[]|*[]>}
	 */
	async handle(obj) {
		let pregenerateTile = false
		const data = obj
		try {
			moment.locale(this.config.locale.timeformat)
			const logReference = data.s2_cell_id

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

			let whoCares = []
			if (data.updated && data.gameplay_condition) {
				data.time_changed = data.updated
				data.condition = data.gameplay_condition
				data.coords = data.polygon
			}
			const currentInGameWeather = data.condition
			const nowTimestamp = Math.floor(Date.now() / 1000)
			const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
			const nextHourTimestamp = currentHourTimestamp + 3600
			const updateHourTimestamp = data.time_changed - (data.time_changed % 3600)
			const previousHourTimestamp = updateHourTimestamp - 3600

			this.log.verbose(`${data.s2_cell_id}: weather received ${data.source == 'fromMonster' ? ' from Monster' : ''} - weather ${currentInGameWeather}`)

			if (!this.controllerData[data.s2_cell_id]) this.controllerData[data.s2_cell_id] = {}
			if (!this.caresData[data.s2_cell_id]) this.caresData[data.s2_cell_id] = {}

			const weatherCellData = this.controllerData[data.s2_cell_id]
			const caresCellData = this.caresData[data.s2_cell_id] || {}

			const previousWeather = weatherCellData[previousHourTimestamp] || -1

			// Remove users not caring about anything anymore
			if (caresCellData.cares) {
				caresCellData.cares = caresCellData.cares.filter((caring) => caring.caresUntil > nowTimestamp)

				// Remove cared pokemon that have disappeared
				caresCellData.cares.forEach((caring) => {
					if (caring.caredPokemons) {
						caring.caredPokemons = caring.caredPokemons.filter((mon) => mon.disappear_time > nowTimestamp)
					}
				})
			}

			whoCares = caresCellData.cares || []

			if (this.config.weather.showAlteredPokemon) {
				// Removing whoCares who don't have a Pokemon affected by this weather change
				whoCares = whoCares.filter((cares) => (('caredPokemons' in cares) ? cares.caredPokemons.find((pokemon) => pokemon.alteringWeathers.includes(currentInGameWeather)) : ''))
			}

			if (!weatherCellData[updateHourTimestamp] || weatherCellData[updateHourTimestamp] && weatherCellData[updateHourTimestamp] != currentInGameWeather || weatherCellData.lastCurrentWeatherCheck < updateHourTimestamp) {
				weatherCellData[updateHourTimestamp] = currentInGameWeather
				weatherCellData.lastCurrentWeatherCheck = updateHourTimestamp

				this.expireWeatherCell(weatherCellData, currentHourTimestamp)
				this.saveCache()
				this.broadcastWeather()
			}

			if (!this.config.weather.weatherChangeAlert) {
				this.log.verbose(`${data.s2_cell_id}: weather change alerts are disabled, nobody cares.`)
				return []
			}

			if (previousWeather === data.condition || whoCares.length === 0) {
				this.log.verbose(`${data.s2_cell_id}: weather has not changed or nobody cares.`)
				return []
			}

			this.log.info(`${data.s2_cell_id}: weather has changed to ${data.condition} and someone might care`)

			if (data.source == 'fromMonster') {
				const s2cell = new S2ts.S2Cell(new S2ts.S2CellId(data.s2_cell_id))
				const s2cellCenter = S2ts.S2LatLng.fromPoint(s2cell.getCenter())
				data.latitude = s2cellCenter.latRadians * 180 / Math.PI
				data.longitude = s2cellCenter.lngRadians * 180 / Math.PI
				data.coords = []
				for (let i = 0; i <= 3; i++) {
					const vertex = S2ts.S2LatLng.fromPoint(s2cell.getVertex(i))
					data.coords.push([parseFloat(vertex.latDegrees), parseFloat(vertex.lngDegrees)])
				}
			}

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })

			if (pregenerateTile && this.config.geocoding.staticMapType.weather && !this.config.weather.showAlteredPokemonStaticMap) {
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'weather', data, this.config.geocoding.staticMapType.weather)
				this.log.debug(`${logReference}: Tile generated ${data.staticMap}`)
			}

			data.oldWeatherId = (previousWeather > -1) ? previousWeather : ''
			data.oldWeatherNameEng = data.oldWeatherId ? this.GameData.utilData.weather[data.oldWeatherId].name : ''
			data.oldWeatherEmojiEng = data.oldWeatherId ? this.GameData.utilData.weather[data.oldWeatherId].emoji : ''
			data.weatherId = data.condition ? data.condition : ''
			data.weatherNameEng = data.weatherId ? this.GameData.utilData.weather[data.weatherId].name : ''
			data.weatherEmojiEng = data.weatherId ? this.GameData.utilData.weather[data.weatherId].emoji : ''

			const jobs = []
			const now = moment.now()
			let weatherTth = moment.preciseDiff(now, nextHourTimestamp * 1000, true)

			let count = 0
			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Weather alert being generated for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				count++
				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating weather alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating weather alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				if (cares.caresUntil < nowTimestamp) {
					this.log.debug(`${data.s2_cell_id}: last tracked pokemon despawned before weather changed`)
					caresCellData.cares = caresCellData.cares.filter((caring) => caring.id != cares.id)
					// eslint-disable-next-line no-continue
					continue
				}
				if (cares.lastChangeAlert == currentHourTimestamp) {
					this.log.debug(`${data.s2_cell_id}: user already alerted for this weather change`)
					// eslint-disable-next-line no-continue
					continue
				}

				const userStillCares = caresCellData.cares.find((caring) => caring.id == cares.id)
				if (userStillCares) {
					userStillCares.lastChangeAlert = currentHourTimestamp
				}

				if (this.config.weather.showAlteredPokemon) {
					// const activePokemons = caresCellData.cares.filter((caring) => caring.id == cares.id)[0].caredPokemons.filter((pokemon) => pokemon.alteringWeathers.includes(data.condition))
					const activePokemons = cares.caredPokemons.filter((pokemon) => pokemon.alteringWeathers.includes(data.condition))

					data.activePokemons = activePokemons.slice(0, this.config.weather.showAlteredPokemonMaxCount) || null
				}
				if (pregenerateTile && this.config.geocoding.staticMapType.weather && this.config.weather.showAlteredPokemon && this.config.weather.showAlteredPokemonStaticMap) {
					data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'weather', data, this.config.geocoding.staticMapType.weather)
					this.log.debug(`${logReference}: Tile generated ${data.staticMap}`)
				}
				data.staticmap = data.staticMap // deprecated
				if (cares.caresUntil) weatherTth = moment.preciseDiff(now, cares.caresUntil * 1000, true)

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				data.oldWeatherName = data.oldWeatherNameEng ? translator.translate(data.oldWeatherNameEng) : ''
				data.oldWeatherEmoji = data.oldWeatherNameEng ? translator.translate(data.oldWeatherEmojiEng) : ''
				data.weatherName = data.weatherNameEng ? translator.translate(data.weatherNameEng) : ''
				data.weatherEmoji = data.weatherEmojiEng ? translator.translate(data.weatherEmojiEng) : ''
				if (this.config.weather.showAlteredPokemon && data.activePokemons) {
					data.activePokemons.map((pok) => {
						pok.name = translator.translate(pok.name)
						pok.formName = translator.translate(pok.formName)
					})
				}

				data.weather = data.weatherName // deprecated
				data.oldweather = data.oldWeatherName // deprecated
				data.oldweatheremoji = data.oldWeatherEmoji // deprecated
				data.weatheremoji = data.weatherEmoji // deprecated

				const view = {
					...data,
					...geoResult,
					id: data.s2_cell_id,
					now: new Date(),
				}

				let [platform] = cares.type.split(':')
				if (platform == 'webhook') platform = 'discord'

				const mustache = this.getDts(logReference, 'weatherchange', platform, cares.template, language)
				if (mustache) {
					const message = JSON.parse(mustache(view, { data: { language } }))

					const work = {
						lat: data.latitude.toString().substring(0, 8),
						lon: data.longitude.toString().substring(0, 8),
						message,
						target: cares.id,
						type: cares.type,
						name: cares.name,
						tth: weatherTth,
						clean: cares.clean,
						emoji: [],
						logReference,
						language,
					}
					jobs.push(work)
				}
			}

			this.log.info(`${logReference}: Weather alert generated and ${count} humans cared.`)

			return jobs
		} catch (e) {
			this.log.error(`${data.s2_cell_id}: Can't seem to handle weather: `, e, data)
		}
	}

	async handleMonsterWeatherChange(data) {
		this.log.debug('Weather - received data from monster controller about weather change', data)
		return this.handle(data)
	}

	/**
	 * handle incoming information from monster controller telling us that a user cares about a particular
	 * pokemon
	 */
	handleUserCares(userCares) {
		// Was in monster controller
		this.log.debug('Weather - notification from monster controller about user who cares', userCares)

		if (!this.caresData[userCares.weatherCellId]) {
			this.caresData[userCares.weatherCellId] = {}
		}
		const weatherCellData = this.caresData[userCares.weatherCellId]

		const cares = userCares.target

		if (weatherCellData.cares) {
			let exists = false
			for (const caring of weatherCellData.cares) {
				if (caring.id === cares.id) {
					if (caring.caresUntil < userCares.caresUntil) {
						caring.caresUntil = userCares.caresUntil
					}
					caring.clean = cares.clean
					caring.ping = cares.ping
					caring.language = cares.language
					caring.template = cares.template
					exists = true
					break
				}
			}
			if (!exists) {
				weatherCellData.cares.push({
					id: cares.id,
					name: cares.name,
					type: cares.type,
					clean: cares.clean,
					ping: cares.ping,
					caresUntil: userCares.caresUntil,
					template: cares.template,
					language: cares.language,
				})
			}
		} else {
			weatherCellData.cares = []
			weatherCellData.cares.push({
				id: cares.id,
				name: cares.name,
				type: cares.type,
				clean: cares.clean,
				ping: cares.ping,
				caresUntil: cares.disappear_time,
				template: cares.template,
				language: cares.language,
			})
		}
		if (this.config.weather.showAlteredPokemon && userCares.pokemon) {
			const data = userCares.pokemon
			for (const caring of weatherCellData.cares) {
				if (caring.id === cares.id) {
					if (!caring.caredPokemons) caring.caredPokemons = []
					caring.caredPokemons.push({
						pokemon_id: data.pokemon_id,
						form: data.form,
						name: data.name,
						formName: data.formName,
						iv: data.iv,
						cp: data.cp,
						latitude: data.latitude,
						longitude: data.longitude,
						disappear_time: data.disappear_time,
						alteringWeathers: data.alteringWeathers,
					})
				}
			}
		}

		this.saveCache()
	}
}

module.exports = Weather
