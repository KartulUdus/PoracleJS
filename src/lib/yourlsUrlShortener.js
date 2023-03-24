const axios = require('axios')

class YourlsUriShortener {
	constructor(log, yourlsUrl, signature) {
		this.yourlsUrl = yourlsUrl
		this.signature = signature
		this.log = log
	}

	async getShortlink(url) {
		try {
			const result = await axios.get(`${this.yourlsUrl}yourls-api.php?signature=${this.signature}&action=shorturl&format=json&url=${encodeURIComponent(url)}`)

			if (result.status !== 200) {
				this.log.warn(`Shortener[yourls]: Failed to shorten ${url}. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return url
			}
			return result.data.shorturl
		} catch (error) {
			if (error.response) {
				this.log.warn(error.response.data)
				if ('message' in error.response.data) {
					if (error.response.data.message.includes('already exists')) {
						return error.response.data.shorturl
					}
				} else {
					this.log.warn(`Shortener[yourls]: Failed to shorten. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
					return url
				}
			} else {
				this.log.warn(`Shortener[yourls]: Failed to shorten. Error: ${error}.`)
				return url
			}
		}
	}
}

module.exports = YourlsUriShortener
