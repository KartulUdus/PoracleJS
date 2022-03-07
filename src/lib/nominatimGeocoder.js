const axios = require('axios')

class NominatimGeocoder {
	constructor(url, timeout) {
		this.baseUrl = url
		this.timeout = timeout || 10000
	}

	async lookup(q) {
		const options = {
			q,
		}

		return this.nominatim('search', options)
	}

	async reverse(lat, lon) {
		const options = {
			lat,
			lon,
		}

		return this.nominatim('reverse', options)
	}

	async nominatim(command, options) {
		const params = {
			format: 'json',
		}

		Object.assign(params, options)

		const timeoutMs = this.timeout

		const source = axios.CancelToken.source()
		const timeout = setTimeout(() => {
			source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
			// Timeout Logic
		}, timeoutMs)

		const url = new URL(command, this.baseUrl)
		url.search = new URLSearchParams(params).toString()

		const response = await axios({
			method: 'get',
			url: url.toString(),
			validateStatus: ((status) => status < 500),
			cancelToken: source.token,
		})
		clearTimeout(timeout)

		return response.status === 200 ? response.data : null
	}
}

module.exports = NominatimGeocoder