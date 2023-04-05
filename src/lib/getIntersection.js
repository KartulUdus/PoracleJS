const axios = require('axios')

class GetIntersection {
	constructor(config, log) {
		this.axios = axios
		this.log = log
		this.config = config
	}

	async getIntersection(latitude, longitude) {
		if (!this.config.geocoding.intersectionUsers || !this.config.geocoding.intersectionUsers.length) {
			return 'No Intersection'
		}

		const random = Math.floor(Math.random() * this.config.geocoding.intersectionUsers.length)
		const choice = this.config.geocoding.intersectionUsers[random]

		const uri = `http://api.geonames.org/findNearestIntersectionJSON?lat=${latitude}&lng=${longitude}&username=${choice}`

		try {
			const result = await axios.get(uri)

			if (result.status !== 200 || !result.data.intersection) {
				this.log.warn(`Failed to find intersection for ${latitude}, ${longitude}. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return 'No Intersection'
			}
			return `${result.data.intersection.street1} & ${result.data.intersection.street2}`
		} catch (error) {
			if (error.response) {
				this.log.warn(`Failed to find intersection for ${latitude}, ${longitude}. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`Failed to find intersection for ${latitude}, ${longitude}. Error: ${error}.`)
			}
			return 'No Intersection'
		}
	}
}

module.exports = GetIntersection