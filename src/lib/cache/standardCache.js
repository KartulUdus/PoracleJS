const NodeCache = require('node-cache')

class PoracleNodeCache {
	constructor(ttl) {
		this.cache = new NodeCache({ stdTTL: ttl, useClones: false })
	}

	async get(key) {
		return this.cache.get(key)
	}

	async set(key, value, ttl) {
		this.cache.set(key, value, ttl)
	}

	getStats() {
		return this.cache.getStats()
	}
}

module.exports = PoracleNodeCache