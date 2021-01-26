const moment = require('moment-timezone')
const axios = require('axios')
const { S2 } = require('s2-geometry')
const S2ts = require('nodes2ts')
const path = require('path')
const pcache = require('flat-cache')
const Controller = require('./controller')

require('moment-precise-range-plugin')

const weatherKeyCache = pcache.load('.weatherKeyCache', path.resolve(`${__dirname}../../../`))
const weatherCache = pcache.load('.weatherCache', path.resolve(`${__dirname}../../../`))

class Weather extends Controller {
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

	async getWeather(weatherObject) {
		const res = {
			current: 0,
			next: 0,
		}
		if (!this.config.weather.enableWeatherForecast
			|| moment().hour() >= moment(weatherObject.disappear * 1000).hour()
			&& !(moment().hour() == 23 && moment(weatherObject.disappear * 1000).hour() == 0)
		) {
			this.log.info('weather forecast target will disappear in current hour')
			return res
		}

		const key = S2.latLngToKey(weatherObject.lat, weatherObject.lon, 10)
		const id = S2.keyToId(key)

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

		if (!Object.keys(data).length || !data.location) {
			const latlng = S2.idToLatLng(id)
			const apiKeyWeatherLocation = await this.getLaziestWeatherKey()
			if (apiKeyWeatherLocation) {
				try {
					// Fetch location information
					const weatherLocation = await axios.get(`https://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKeyWeatherLocation}&q=${latlng.lat}%2C${latlng.lng}`)
					data.location = weatherLocation.data.Key
				} catch (err) {
					this.log.error(`Fetching AccuWeather location errored with: ${err}`)
					return res
				}
			} else {
				this.log.info('Couldn\'t fetch weather location - no API key available')
				return res
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
			Object.entries(data).forEach(([timestamp]) => {
				if (timestamp < (currentHourTimestamp - 3600)) {
					delete data[timestamp]
				}
			})
			const apiKeyWeatherInfo = await this.getLaziestWeatherKey()
			if (apiKeyWeatherInfo) {
				try {
					// Fetch new weather information
					const weatherInfo = await axios.get(`https://dataservice.accuweather.com/forecasts/v1/hourly/12hour/${data.location}?apikey=${apiKeyWeatherInfo}`)
					for (const forecast in Object.entries(weatherInfo.data)) {
						if (weatherInfo.data[forecast].EpochDateTime > currentHourTimestamp) {
							data[weatherInfo.data[forecast].EpochDateTime] = await this.mapPoGoWeather(weatherInfo.data[forecast].WeatherIcon)
						}
					}
					data.forecastTimeout = forecastTimeout
					data.lastCurrentWeatherCheck = currentHourTimestamp
				} catch (err) {
					this.log.error(`Fetching AccuWeather weather info errored with: ${err}`)
					return res
				}
			} else {
				this.log.info('Couldn\'t fetch weather forecast - no API key available')
				return res
			}
		}

		res.current = data[currentHourTimestamp]
		res.next = data[nextHourTimestamp]

		weatherCache.setKey('weatherCacheData', this.controllerData)
		weatherCache.save(true)

		return res
	}

	async handle(obj) {
		let pregenerateTile = false
		const data = obj
		try {
			moment.locale(this.config.locale.timeformat)

			switch (this.config.geocoding.staticProvider.toLowerCase()) {
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

			let whoCares = []
			// this.log.error('[DEBUG WEATHER] ['+data.trace+'] data payload :', data)
			if (data.updated && data.gameplay_condition) {
				data.time_changed = data.updated
				data.condition = data.gameplay_condition
				data.coords = data.polygon
			}
			// this.log.error(`[DEBUG WEATHER] [${data.trace}] s2_cell_id ${data.s2_cell_id} | time_changed ${data.time_changed} | condition ${data.condition}`)
			const currentInGameWeather = data.condition
			const nowTimestamp = Math.floor(Date.now() / 1000)
			const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
			const nextHourTimestamp = currentHourTimestamp + 3600
			const updateHourTimestamp = data.time_changed - (data.time_changed % 3600)
			const previousHourTimestamp = updateHourTimestamp - 3600

			if (!this.controllerData[data.s2_cell_id]) this.controllerData[data.s2_cell_id] = {}

			const weatherCellData = this.controllerData[data.s2_cell_id]
			const previousWeather = weatherCellData[previousHourTimestamp] || -1
			if ('cares' in weatherCellData) {
				whoCares = weatherCellData.cares
			}
			// Remove users not caring about anything anymore
			if (weatherCellData.cares) weatherCellData.cares = weatherCellData.cares.filter((caring) => caring.caresUntil > nowTimestamp)

			if (this.config.weather.showAlteredPokemon) {
				// Removing whoCares who don't have a Pokemon affected by this weather change
				whoCares = whoCares.filter((cares) => (('caredPokemons' in cares) ? cares.caredPokemons.find((pokemon) => pokemon.alteringWeathers.includes(currentInGameWeather)) : ''))
			}

			if (!weatherCellData[updateHourTimestamp] || weatherCellData[updateHourTimestamp] && weatherCellData[updateHourTimestamp] != currentInGameWeather || weatherCellData.lastCurrentWeatherCheck < updateHourTimestamp) {
				weatherCellData[updateHourTimestamp] = currentInGameWeather
				weatherCellData.lastCurrentWeatherCheck = updateHourTimestamp
			}

			weatherCache.setKey('weatherCacheData', this.controllerData)
			weatherCache.save(true)

			if (!this.config.weather.weatherChangeAlert) {
				this.log.info('weather change alerts are disabled, nobody cares.')
				return []
			}

			if (previousWeather === data.condition || whoCares.length === 0) {
				this.log.info(`weather has not changed in ${data.s2_cell_id} or nobody cares.`)
				return []
			}

			this.log.info(`weather has changed to ${data.condition} in ${data.s2_cell_id} and someone might care`)

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

			if (pregenerateTile && !this.config.weather.showAlteredPokemonStaticMap) {
				data.staticmap = await this.tileserverPregen.getPregeneratedTileURL('weather', data)
				// this.log.error(`[DEBUG WEATHER] [${data.trace}] pregenerated common staticMap : ${data.staticmap}`)
			}

			if (previousWeather > -1) {
				data.oldweather = this.utilData.weather[previousWeather] ? this.translator.translate(this.utilData.weather[previousWeather].name) : ''
				data.oldweatheremoji = this.utilData.weather[previousWeather] ? this.translator.translate(this.utilData.weather[previousWeather].emoji) : ''
			} else {
				data.oldweather = ''
				data.oldweatheremoji = ''
			}
			data.weather = this.utilData.weather[data.condition] ? this.translator.translate(this.utilData.weather[data.condition].name) : ''
			data.weatheremoji = this.utilData.weather[data.condition] ? this.translator.translate(this.utilData.weather[data.condition].emoji) : ''

			const jobs = []
			const now = moment.now()
			let weatherTth = moment.preciseDiff(now, nextHourTimestamp * 1000, true)

			for (const cares of whoCares) {
				// this.log.error('[DEBUG WEATHER] ['+data.trace+'] current cares', cares)
				if (cares.caresUntil < nowTimestamp) {
					this.log.info(`last tracked pokemon despawned before weather changed in ${data.s2_cell_id}`)
					weatherCellData.cares = weatherCellData.cares.filter((caring) => caring.id != cares.id)
					// this.log.error('[DEBUG WEATHER] ['+data.trace+'] current weatherCellData.cares', weatherCellData.cares)
					// eslint-disable-next-line no-continue
					continue
				}
				if (cares.lastChangeAlert == currentHourTimestamp) {
					this.log.info(`user already alerted for this weather change in ${data.s2_cell_id}`)
					// this.log.error('[DEBUG WEATHER] ['+data.trace+'] current cares.lastChangeAlert == currentHourTimestamp', weatherCellData.cares)
					// eslint-disable-next-line no-continue
					continue
				}
				weatherCellData.cares.filter((caring) => caring.id == cares.id)[0].lastChangeAlert = currentHourTimestamp
				// this.log.error('[DEBUG WEATHER] ['+data.trace+'] current lastChangeAlert = currentHourTimestamp', weatherCellData.cares)

				if (pregenerateTile && this.config.weather.showAlteredPokemon && this.config.weather.showAlteredPokemonStaticMap) {
					const activePokemons = weatherCellData.cares.filter((caring) => caring.id == cares.id)[0].caredPokemons.filter((pokemon) => pokemon.alteringWeathers.includes(data.condition))
					data.activePokemons = activePokemons.slice(0, this.config.weather.showAlteredPokemonMaxCount) || null
					data.staticmap = await this.tileserverPregen.getPregeneratedTileURL('weather', data)
					// this.log.error(`[DEBUG WEATHER] [${data.trace}] pregenerated custom staticMap : ${data.staticmap}`)
				}
				if (cares.caresUntil) weatherTth = moment.preciseDiff(now, cares.caresUntil * 1000, true)

				const view = {
					...data,
					...geoResult,
					id: data.s2_cell_id,
					now: new Date(),
				}
				let platform = cares.type.split(':')[0]
				if (platform == 'webhook') platform = 'discord'

				let weatherDts
				if (cares.template) weatherDts = this.dts.find((template) => template.type === 'weatherchange' && template.id.toString() == cares.template.toString() && template.platform === platform)
				if (!weatherDts) weatherDts = this.dts.find((template) => template.type === 'weatherchange' && template.default && template.platform === platform)
				if (!weatherDts) {
					this.log.error(`Cannot find DTS template weatherchange ${cares.template}`)
					// eslint-disable-next-line no-continue
					continue
				}
        const template = JSON.stringify(weatherDts.template)
				const mustache = this.mustache.compile(this.translator.translate(template))
				const message = JSON.parse(mustache(view))

				const work = {
					lat: data.latitude.toString().substring(0, 8),
					lon: data.longitude.toString().substring(0, 8),
					message,
					target: cares.id,
					type: cares.type,
					name: cares.name,
					tth: weatherTth,
					clean: cares.clean,
					tracing: data.trace,
					emoji: [],
				}
				jobs.push(work)
				this.addDiscordCache(cares.id)
			}

			return jobs
		} catch (e) {
			this.log.error('Can\'t seem to handle weather: ', e, data)
		}
	}
}

module.exports = Weather
