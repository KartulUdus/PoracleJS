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
		this.spawnEvents = []
		this.questEvents = []
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

		const url = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json'
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
		try {
			// create filtered pokemon spawn event list
			// for now, only filter by eventType until spawn information is available
			let filteredEvents = []
			for (const event of events.filter((x) => x.eventType === 'community-day' || x.eventType === 'pokemon-spotlight-hour')) {
				filteredEvents.push(event)
			}
			this.spawnEvents = filteredEvents

			// create filtered quest event list
			// for now, only filter by eventType until field research task information is available
			filteredEvents = []
			for (const event of events.filter((x) => x.eventType === 'community-day')) {
				filteredEvents.push(event)
			}
			this.questEvents = filteredEvents
		} catch (err) {
			this.log.error('PogoEvents: Error creating filtered spawn and quest event lists', err)
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
	eventChangesSpawn(startTime, disappearTime, lat, lon) {
		if (!this.spawnEvents) return

		try {
			const tz = geoTz.find(lat, lon)[0].toString()

			for (const event of this.spawnEvents) {
				const eventStart = moment.tz(event.start, tz).unix()
				const eventEnd = moment.tz(event.end, tz).unix()
				if (startTime < eventStart && eventStart < disappearTime) {
					return {
						reason: 'start',
						name: event.name,
						time: moment(event.start).format('HH:mm'),
					}
				}
				if (startTime < eventEnd && eventEnd < disappearTime) {
					return {
						reason: 'end',
						name: event.name,
						time: moment(event.end).format('HH:mm'),
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
		if (!this.questEvents) return

		try {
			const tz = geoTz.find(lat, lon)[0].toString()

			for (const event of this.questEvents) {
				const eventStart = moment.tz(event.start, tz).unix()
				const eventEnd = moment.tz(event.end, tz).unix()
				if (startTime < eventStart && eventStart < disappearTime) {
					return {
						reason: 'start',
						name: event.name,
						time: moment(event.start).format('HH:mm'),
					}
				}
				if (startTime < eventEnd && eventEnd < disappearTime) {
					return {
						reason: 'end',
						name: event.name,
						time: moment(event.end).format('HH:mm'),
					}
				}
			}
		} catch (err) {
			this.log.error('PogoEvents: Error parsing event file', err)
		}
	}
}

module.exports = PogoEventParser
