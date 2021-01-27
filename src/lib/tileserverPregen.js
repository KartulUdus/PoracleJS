const axios = require('axios')
const config = require('config')
const { log } = require('./logger.js')

class TileserverPregen {
	constructor() {
		this.axios = axios
		this.log = log
		this.config = config
	}

	async getPregeneratedTileURL(type, data, disableMultistaticmap) {
		let mapType = disableMultistaticmap ? "staticmap" : "multistaticmap"
		const url = `${this.config.geocoding.staticProviderURL}/${mapType}/${mapType}-poracle-${type}?pregenerate=true&regeneratable=true`
		try {
			const result = await axios.post(url, data)
			if (result.status !== 200) {
				this.log.warn(`Failed to Pregenerate ${mapType}. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return null
			} if (typeof result.data !== 'string') {
				this.log.warn('Failed to Pregenerate ${mapType}. No id returned.')
				return null
			}
			return `${this.config.geocoding.staticProviderURL}/${mapType}/pregenerated/${result.data}`
		} catch (error) {
			if (error.response) {
				this.log.warn(`Failed to Pregenerate ${mapType}. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`Failed to Pregenerate ${mapType}. Error: ${error}.`)
			}
			return null
		}
	}
}

module.exports = TileserverPregen
