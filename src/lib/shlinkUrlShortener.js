const axios = require('axios')

class ShlinkUrlShortener {
	constructor(log, shlinkUrl, apiKey, domain) {
		this.shlinkUrl = shlinkUrl
		this.apiKey = apiKey
		this.log = log
		this.domain = domain
	}

	async getShortlink(url) {
		try {
			const timeoutMs = 10000

			const source = axios.CancelToken.source()
			const timeout = setTimeout(() => {
				source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
				// Timeout Logic
			}, timeoutMs)

			const result = await axios({
				method: 'post',
				url: `${this.shlinkUrl}/rest/v2/short-urls`,
				headers: {
					'X-Api-Key': this.apiKey,
				},
				data: {
					longUrl: url,
					findIfExists: true,
					domain: this.domain || null,
				},
				cancelToken: source.token,
			})

			clearTimeout(timeout)
			if (result.status !== 200) {
				this.log.warn(`Shortener[shlink]: Failed to shorten ${url}. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return url
			}
			return result.data.shortUrl
		} catch (error) {
			if (error.response) {
				this.log.warn(`Shortener[shlink]: Failed to shorten ${url}. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`Shortener[shlink]: Failed to shorten ${url}. Error: ${error}.`)
			}
			return url
		}
	}
}

module.exports = ShlinkUrlShortener