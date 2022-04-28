/* Night Time caclulations */
const moment = require('moment-timezone')

const SunCalc = require('suncalc')

/* Night time clculations */

function setNightTime(data, checkTime) {
	const times = SunCalc.getTimes(checkTime.toDate(), data.latitude, data.longitude)
	const sunsetTime = moment(times.sunset)
	const sunriseTime = moment(times.sunrise)

	const dawnEndTime = moment(sunriseTime).add({ hours: 1 })
	const duskStartTime = moment(sunsetTime).subtract({ hours: 1 })

	data.nightTime = !checkTime.isBetween(sunriseTime, sunsetTime)
	data.dawnTime = checkTime.isBetween(sunriseTime, dawnEndTime)
	data.duskTime = checkTime.isBetween(duskStartTime, sunsetTime)
}

module.exports = { setNightTime }