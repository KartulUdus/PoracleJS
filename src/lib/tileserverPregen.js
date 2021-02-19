const axios = require('axios')

class TileserverPregen {
	constructor(config, log) {
		this.axios = axios
		this.log = log
		this.config = config
	}

	async getPregeneratedTileURL(logReference, type, data) {
		const url = `${this.config.geocoding.staticProviderURL}/staticmap/poracle-${type}?pregenerate=true&regeneratable=true`
		try {
			this.log.debug(`${logReference}: Pre-generating static map ${url}`)
			const result = await axios.post(url, data)
			if (result.status !== 200) {
				this.log.warn(`${logReference}: Failed to Pregenerate StaticMap. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return null
			} if (typeof result.data !== 'string') {
				this.log.warn(`${logReference}: Failed to Pregenerate StaticMap. No id returned.`)
				return null
			}
			return `${this.config.geocoding.staticProviderURL}/staticmap/pregenerated/${result.data}`
		} catch (error) {
			if (error.response) {
				this.log.warn(`${logReference}: Failed to Pregenerate StaticMap. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`${logReference}: Failed to Pregenerate StaticMap. Error: ${error}.`)
			}
			return null
		}
	}
}

module.exports = TileserverPregen
