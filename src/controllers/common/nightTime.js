/* Night Time caclulations */
const moment = require('moment-timezone')
const {
	getSunset,
	getSunrise,
} = require('sunrise-sunset-js')

/* Night time clculations */

function setNightTime(data, checkTime) {
	const sunsetTime = moment(getSunset(data.latitude, data.longitude, checkTime.toDate()))
	const sunriseTime = moment(getSunrise(data.latitude, data.longitude, checkTime.toDate()))
	const dawnEndTime = moment(sunriseTime).add({ hours: 1 })
	const duskStartTime = moment(sunsetTime).subtract({ hours: 1 })

	data.nightTime = !checkTime.isBetween(sunriseTime, sunsetTime)
	data.dawnTime = checkTime.isBetween(sunriseTime, dawnEndTime)
	data.duskTime = checkTime.isBetween(duskStartTime, sunsetTime)
}

module.exports = { setNightTime }