/* Night Time caclulations */
const moment = require('moment-timezone')

const SunCalc = require('suncalc')

/* Night time clculations */

function setNightTime(data, checkTime, config) {
	const times = SunCalc.getTimes(checkTime.toDate(), data.latitude, data.longitude)
	const sunsetTime = moment(times.sunset)
	const sunriseTime = moment(times.sunrise)

	const dawnEndTime = moment(sunriseTime).add({ hours: 1 })
	const duskStartTime = moment(sunsetTime).subtract({ hours: 1 })

	data.nightTime = !checkTime.isBetween(sunriseTime, sunsetTime)
	data.dawnTime = checkTime.isBetween(sunriseTime, dawnEndTime)
	data.duskTime = checkTime.isBetween(duskStartTime, sunsetTime)

	const defaultStyle = 'klokantech-basic'

	if (data.dawnTime) {
		data.style = config.geocoding.dawnStyle || defaultStyle
	} else if (data.duskTime) {
		data.style = config.geocoding.duskStyle || defaultStyle
	} else if (data.nightTime) {
		data.style = config.geocoding.nightStyle || defaultStyle
	} else {
		data.style = config.geocoding.dayStyle || defaultStyle
	}
}

module.exports = { setNightTime }