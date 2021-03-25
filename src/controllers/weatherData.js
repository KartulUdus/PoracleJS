const { S2 } = require('s2-geometry')
const EventEmitter = require('events')

const path = require('path')
const pcache = require('flat-cache')

const weatherCache = pcache.load('weatherCache', path.resolve(`${__dirname}../../../.cache/`))

class WeatherData extends EventEmitter {
	constructor(config, log) {
		super()
		this.config = config
		this.log = log
		this.controllerData = weatherCache.getKey('weatherCacheData') || {} // populate from cache on first load
		this.localWeatherData = {}
	}

	/**
	 * Called on inbound weather broadcast from weather controller
	 * @param data
	 */
	receiveWeatherBroadcast(data) {
		this.controllerData = data
	}

	// eslint-disable-next-line class-methods-use-this
	getWeatherCellId(lat, lon) {
		const weatherCellKey = S2.latLngToKey(lat, lon, 10)
		return S2.keyToId(weatherCellKey)
	}

	/**
	 * Get the current weather for given lat, lon based on current
	 * weather information held in local controller
	 */

	getCurrentWeatherInCellLatLon(lat, lon) {
		return this.getCurrentWeatherInCell(this.getWeatherCellId(lat, lon))
	}

	getCurrentWeatherInCell(weatherCellId) {
		const nowTimestamp = Math.floor(Date.now() / 1000)
		const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
		let currentCellWeather = null

		if (weatherCellId in this.controllerData) {
			const weatherCellData = this.controllerData[weatherCellId]
			if (weatherCellData) {
				const localCellData = this.localWeatherData[weatherCellId]

				if (weatherCellData.lastCurrentWeatherCheck >= currentHourTimestamp) currentCellWeather = weatherCellData[currentHourTimestamp]
				if (localCellData && localCellData.currentHourTimestamp == currentHourTimestamp) currentCellWeather = localCellData.monsterWeather // We have discovered weather locally, use that
			}
		}

		return currentCellWeather
	}

	/**
	 * Analyse an incoming pokemon's weather data to see if there is a discrepancy
	 * to current weather known information, and if so notify weather controller of a weather
	 * change
	 * @param weatherCellId
	 * @param latitude
	 * @param longitude
	 * @param monsterWeather
	 */
	checkWeatherOnMonster(weatherCellId, latitude, longitude, monsterWeather) {
		const nowTimestamp = Math.floor(Date.now() / 1000)
		const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
		const previousHourTimestamp = currentHourTimestamp - 3600

		if (!(weatherCellId in this.localWeatherData)) {
			this.localWeatherData[weatherCellId] = {}
		}

		if (!(weatherCellId in this.controllerData)) {
			this.controllerData[weatherCellId] = {} // provide safe access to weather information if weather controller did not give it to us
		}

		const localWeatherCellData = this.localWeatherData[weatherCellId] // local information about weather per cell
		const weatherCellData = this.controllerData[weatherCellId] // weather information broadcast to us from weather controller

		if (nowTimestamp > (currentHourTimestamp + 30) && monsterWeather) {
			if (!localWeatherCellData.weatherFromBoost) localWeatherCellData.weatherFromBoost = [0, 0, 0, 0, 0, 0, 0, 0]
			if (!weatherCellData.lastCurrentWeatherCheck) weatherCellData.lastCurrentWeatherCheck = previousHourTimestamp

			// If the weather that we see agrees with latest up-to-date broadcast, reset counters
			if (monsterWeather == weatherCellData[currentHourTimestamp] && weatherCellData.lastCurrentWeatherCheck >= currentHourTimestamp) {
				localWeatherCellData.weatherFromBoost = [0, 0, 0, 0, 0, 0, 0, 0]
			}

			if ((monsterWeather !== weatherCellData[currentHourTimestamp] || (monsterWeather == weatherCellData[currentHourTimestamp] && weatherCellData.lastCurrentWeatherCheck < currentHourTimestamp))) {
				localWeatherCellData.weatherFromBoost = localWeatherCellData.weatherFromBoost.map((value, index) => {
					if (index == monsterWeather) return value + 1
					return value - 1
				})
				if (localWeatherCellData.weatherFromBoost.some((x) => x > 4)) {
					localWeatherCellData.weatherFromBoost = [0, 0, 0, 0, 0, 0, 0, 0]

					// we believe that weather has changed and we have been told about this, let weather controller know, if we haven't already

					if (localWeatherCellData.currentHourTimestamp !== currentHourTimestamp
						|| localWeatherCellData.monsterWeather !== monsterWeather) {
						// save the weather locally
						localWeatherCellData.currentHourTimestamp = currentHourTimestamp
						localWeatherCellData.monsterWeather = monsterWeather

						this.log.info(`Boosted Pokémon! Force update of weather in cell ${weatherCellId} with weather ${monsterWeather}`)

						this.emit('weatherChanged', {
							longitude,
							latitude,
							s2_cell_id: weatherCellId,
							gameplay_condition: monsterWeather,
							updated: nowTimestamp,
							source: 'fromMonster',
						})
					}
				}
			}
		}
	}

	// eslint-disable-next-line class-methods-use-this
	getWeatherTimes() {
		const nowTimestamp = Math.floor(Date.now() / 1000)
		const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
		const previousHourTimestamp = currentHourTimestamp - 3600
		const nextHourTimestamp = currentHourTimestamp + 3600

		return {
			nowTimestamp, currentHourTimestamp, previousHourTimestamp, nextHourTimestamp,
		}
	}

	/**
	 * Gets forecast data (current and next hour) for pokemon at lat, lon
	 * @param lat
	 * @param lon
	 * @param disappearTime
	 * @returns {null}
	 */
	async getWeatherForecast(id) {
		const nowTimestamp = Math.floor(Date.now() / 1000)
		const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
		const nextHourTimestamp = currentHourTimestamp + 3600

		const res = {
			current: 0,
			next: 0,
		}

		if (!this.controllerData[id]) this.controllerData[id] = {}
		let data = this.controllerData[id]

		if (!data[nextHourTimestamp]
			|| !data.forecastTimeout
			|| data.forecastTimeout <= currentHourTimestamp
		) {
			// We would like fresh data
			this.log.info(`${id}: Requesting weather forecast`)

			if (data.lastForecastLoad !== currentHourTimestamp) {
				this.emit('weatherForecastRequested', id)

				let count = 100
				do {
					await this.sleep(50)
					// force data to be refreshed
					data = this.controllerData[id]
				} while (data.lastForecastLoad !== currentHourTimestamp && --count)
				this.log.debug(`${id}: Weather forecast wait counter: ${count}`)
				if (!count) {
					// timeout - avoid attempting this fetch again from this worker
					data.lastForecastLoad = currentHourTimestamp
				}
			}
		}

		res.current = data[currentHourTimestamp] || 0
		res.next = data[nextHourTimestamp] || 0

		this.log.debug(`${id}: Requesting weather forecast - last load req ${data.lastForecastLoad} current ${currentHourTimestamp} returning [current:${res.current} next:${res.next}]`)

		return res
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) {
		return new Promise((resolve) => setTimeout(resolve, n))
	}
}

module.exports = WeatherData
