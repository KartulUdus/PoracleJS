const axios = require('axios')

class GetMemes {
	constructor(log) {
		this.log = log
	}

	async getMemes() {
		try {
			const result = await axios.get('https://meme-api.com/gimme')

			if (result.status !== 200) {
				this.log.warn(`MeMeR: Failed to get meme. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return 'https://usagif.com/wp-content/uploads/2021/4fh5wi/pepefrg-22.gif'
			}
			return result.data.url
		} catch (error) {
			if (error.response) {
				this.log.warn(`MeMeR: Failed to get meme. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`MeMeR: Failed to get meme. Error: ${error}.`)
			}
			return 'https://usagif.com/wp-content/uploads/2021/4fh5wi/pepefrg-22.gif'
		}
	}
}

module.exports = GetMemes