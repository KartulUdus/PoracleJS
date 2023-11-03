const axios = require('axios')

/**
 * Class for handling jms412's shiny list
 *
 */
class ShinyPossible {
	constructor(log) {
		this.log = log
	}

	/**
	 * Download latest shiny list
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

		const url = 'https://raw.githubusercontent.com/jms412/PkmnShinyMap/main/shinyPossible.json'
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
	 * Set parser to use given shiny list
	 * @param events
	 */
	loadMap(shinyPossibleMap) {
		this.shinyPossibleMap = shinyPossibleMap
	}

	/**
	 *
	 * @param pokemonId
	 * @param formId
	 * @returns {{reason: string, name, time}}
	 */
	isShinyPossible(pokemonId, formId) {
		if (!this.shinyPossibleMap) return false

		try {
			if (!this.shinyPossibleMap.map) return false
			if (`${pokemonId}_${formId}` in this.shinyPossibleMap.map) return true
			if (pokemonId in this.shinyPossibleMap.map) return true

			return false
		} catch (err) {
			this.log.error('ShinyPossible: Error parsing shiny file', err)
		}
	}
}

module.exports = ShinyPossible
