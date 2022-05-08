const moment = require('moment-timezone')
const geoTz = require('geo-tz')

function setGameWeather(data, translator, GameData, emojiLookup, platform, currentCellWeather) {
	data.gameWeatherId = GameData.utilData.weather[currentCellWeather] ? currentCellWeather : ''
	data.gameWeatherName = GameData.utilData.weather[currentCellWeather] ? translator.translate(GameData.utilData.weather[currentCellWeather].name) : ''
	data.gameWeatherEmoji = GameData.utilData.weather[currentCellWeather] ? translator.translate(emojiLookup.lookup(GameData.utilData.weather[currentCellWeather].emoji, platform)) : ''

	data.gameweather = data.gameWeatherName // deprecated
	data.gameweatheremoji = data.gameWeatherEmoji // deprecated
}

function setNextWeatherText(data, translator, GameData, emojiLookup, platform) {
	if (data.weatherNext) {
		if (!data.weatherCurrent) {
			data.weatherChange = `⚠️ ${translator.translate('Possible weather change at')} ${data.weatherChangeTime} : ➡️ ${translator.translate(GameData.utilData.weather[data.weatherNext].name)} ${translator.translate(emojiLookup.lookup(GameData.utilData.weather[data.weatherNext].emoji, platform))}`
			data.weatherCurrentName = translator.translate('unknown')
			data.weatherCurrentEmoji = '❓'
		} else {
			data.weatherChange = `⚠️ ${translator.translate('Possible weather change at')} ${data.weatherChangeTime} : ${translator.translate(GameData.utilData.weather[data.weatherCurrent].name)} ${translator.translate(emojiLookup.lookup(GameData.utilData.weather[data.weatherCurrent].emoji, platform))} ➡️ ${translator.translate(GameData.utilData.weather[data.weatherNext].name)} ${translator.translate(emojiLookup.lookup(GameData.utilData.weather[data.weatherNext].emoji, platform))}`
			data.weatherCurrentName = translator.translate(GameData.utilData.weather[data.weatherCurrent].name)
			data.weatherCurrentEmoji = translator.translate(emojiLookup.lookup(GameData.utilData.weather[data.weatherCurrent].emoji, platform))
		}
		data.weatherNextName = translator.translate(GameData.utilData.weather[data.weatherNext].name)
		data.weatherNextEmoji = translator.translate(emojiLookup.lookup(GameData.utilData.weather[data.weatherNext].emoji, platform))
	}
}

/* Forecast information */

// relies on data.weather being present

async function calculateForecastImpact(data, GameData, weatherCellId, weatherData, disappearTimeUnix, config) {
	// get Weather Forecast information

	if (!config.weather.enableWeatherForecast) return

	const { nextHourTimestamp } = weatherData.getWeatherTimes()
	if (disappearTimeUnix > nextHourTimestamp) {
		const weatherForecast = await weatherData.getWeatherForecast(weatherCellId)

		let pokemonShouldBeBoosted = false
		let pokemonWillBeBoosted = false
		const currentBoostedTypes = weatherForecast.current ? GameData.utilData.weatherTypeBoost[weatherForecast.current] : []
		const forecastBoostedTypes = weatherForecast.next ? GameData.utilData.weatherTypeBoost[weatherForecast.next] : []
		if (weatherForecast.current > 0 && currentBoostedTypes.filter((boostedType) => data.types.includes(boostedType)).length > 0) pokemonShouldBeBoosted = true
		if (weatherForecast.next > 0 && ((data.weather > 0 && weatherForecast.next !== data.weather) || (weatherForecast.current > 0 && weatherForecast.next !== weatherForecast.current) || (pokemonShouldBeBoosted && data.weather === 0))) {
			const weatherChangeTime = moment((disappearTimeUnix - (disappearTimeUnix % 3600)) * 1000)
				.tz(geoTz.find(data.latitude, data.longitude)[0]
					.toString())
				.format(config.locale.time)
				.slice(0, -3)
			pokemonWillBeBoosted = forecastBoostedTypes.filter((boostedType) => data.types.includes(boostedType)).length > 0 ? 1 : 0
			if (data.weather > 0 && !pokemonWillBeBoosted || data.weather === 0 && pokemonWillBeBoosted) {
				weatherForecast.current = data.weather > 0 ? data.weather : weatherForecast.current
				if (pokemonShouldBeBoosted && data.weather === 0) {
					data.weatherCurrent = 0
				} else {
					data.weatherCurrent = weatherForecast.current
				}
				data.weatherChangeTime = weatherChangeTime
				data.weatherNext = weatherForecast.next
			}
		}
		//		this.log.debug(`${logReference}: Pokemon ${data.pokemon_id} cell: ${weatherCellId} types ${JSON.stringify(data.types)} weather ${data.weather} Forecast ${weatherForecast.current} [boosted ${pokemonShouldBeBoosted} ${JSON.stringify(currentBoostedTypes)}] next ${weatherForecast.next} [boosted ${pokemonWillBeBoosted} ${JSON.stringify(forecastBoostedTypes)}]`)
	}
}

module.exports = { setGameWeather, setNextWeatherText, calculateForecastImpact }
