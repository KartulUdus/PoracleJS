const axios = require('axios')

class HideUriShortener {
	constructor(log) {
		this.log = log
	}

	async getShortlink(url) {
		try {
			const result = await axios.post('https://hideuri.com/api/v1/shorten', `url=${encodeURIComponent(url)}`)

			if (result.status !== 200) {
				this.log.warn(`Shortener[hideuri]: Failed to shorten ${url}. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return url
			}
			return result.data.result_url
		} catch (error) {
			if (error.response) {
				this.log.warn(`Shortener[hideuri]: Failed to shorten ${url}. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`Shortener[hideuri]: Failed to shorten ${url}StaticMap. Error: ${error}.`)
			}
			return url
		}
	}
}

module.exports = HideUriShortener
