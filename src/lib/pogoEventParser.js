const axios = require('axios')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')

/**
 * Class for handling Malte's Event list
 * see https://github.com/ccev/pogoinfo/tree/v2/active
 */
class PogoEventParser {
	constructor(log) {
		this.log = log
	}

	/**
	 * Download lateste event list
	 * @returns {Promise<any>}
	 */
	// eslint-disable-next-line class-methods-use-this
	async download() {
		const timeoutMs = 10000

		const source = axios.CancelToken.source()
		const timeout = setTimeout(() => {
			source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
			// Timeout Logic
		}, timeoutMs)

		const url = 'https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/events.json'
		const result = await axios({
			method: 'get',
			url,
			validateStatus: ((status) => status < 500),
			cancelToken: source.token,
		})

		clearTimeout(timeout)
		return result.data
	}

	/**
	 * Set parser to use given event list
	 * @param events
	 */
	loadEvents(events) {
		this.events = events
	}

	/**
	 * Determine if a given event (start time, end time) at a given (lat, lon) would be changed by event
	 * @param startTime
	 * @param disappearTime
	 * @param lat
	 * @param lon
	 * @returns {{reason: string, name, time}}
	 */
	eventChangesSpawn(startTime, disappearTime, lat, lon) {
		if (!this.events) return

		try {
			const tz = geoTz.find(lat, lon)[0].toString()

			for (const event of this.events.filter((x) => (x.spawns && x.spawns.length) || x.type === 'community-day' || x.type === 'spotlight-hour')) {
				const eventStart = moment.tz(event.start, tz).unix()
				const eventEnd = moment.tz(event.end, tz).unix()
				if (startTime < eventStart && eventStart < disappearTime) {
					return {
						reason: 'start',
						name: event.name,
						time: event.start.split(' ')[1],
					}
				}
				if (startTime < eventEnd && eventEnd < disappearTime) {
					return {
						reason: 'end',
						name: event.name,
						time: event.end.split(' ')[1],
					}
				}
			}
		} catch (err) {
			this.log.error('PogoEvents: Error parsing event file', err)
		}
	}

	/**
	 * Determine if a given event (start time, end time) at a given (lat, lon) would be changed by event
	 * @param startTime
	 * @param disappearTime
	 * @param lat
	 * @param lon
	 * @returns {{reason: string, name, time}}
	 */
	eventChangesQuest(startTime, disappearTime, lat, lon) {
		if (!this.events) return

		try {
			const tz = geoTz.find(lat, lon)[0].toString()

			for (const event of this.events.filter((x) => x.has_quests)) {
				const eventStart = moment.tz(event.start, tz).unix()
				const eventEnd = moment.tz(event.end, tz).unix()
				if (startTime < eventStart && eventStart < disappearTime) {
					return {
						reason: 'start',
						name: event.name,
						time: event.start.split(' ')[1],
					}
				}
				if (startTime < eventEnd && eventEnd < disappearTime) {
					return {
						reason: 'end',
						name: event.name,
						time: event.end.split(' ')[1],
					}
				}
			}
		} catch (err) {
			this.log.error('PogoEvents: Error parsing event file', err)
		}
	}
}

module.exports = PogoEventParser
