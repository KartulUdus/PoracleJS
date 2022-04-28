/* Night Time caclulations */
const moment = require('moment-timezone')
const {
	getSunset,
	getSunrise,
} = require('sunrise-sunset-js')

const SunCalc = require('suncalc')

// function convertToTz(time, tz) {
// 	const options = {timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'}
// 	return new Date(Date.parse(new Intl.DateTimeFormat('default', options).format(time)))
//
// }

/* Night time clculations */

function setNightTime(data, checkTime, tz) {
	// const sunsetTime = moment(getSunset(data.latitude, data.longitude, checkTime.toDate()))
	// const sunriseTime = moment(getSunrise(data.latitude, data.longitude, checkTime.toDate()))

	const times = SunCalc.getTimes(checkTime.toDate(), data.latitude, data.longitude)

	const sunsetTime = moment(times.sunset)
	const sunriseTime = moment(times.sunrise)

//	const sunsetTime3 = moment(convertToTz(times.sunset, tz))

	const dawnEndTime = moment(sunriseTime).add({ hours: 1 })
	const duskStartTime = moment(sunsetTime).subtract({ hours: 1 })

	data.nightTime = !checkTime.isBetween(sunriseTime, sunsetTime)
	data.dawnTime = checkTime.isBetween(sunriseTime, dawnEndTime)
	data.duskTime = checkTime.isBetween(duskStartTime, sunsetTime)
}

module.exports = { setNightTime }