const redis = require('redis')
const { promisify } = require('util')

class PoracleRedisCache {
	constructor(ttl, host, port, database, user, password, prefix) {
		const options = {
			host,
			port,
		}
		if (user) options.user = user
		if (password) options.password = password
		if (database) options.db = database
		if (prefix) options.prefix = prefix

		this.client = redis.createClient(options)
		this.defaultTtl = ttl
		this.hits = 0
		this.misses = 0
	}

	async get(key) {
		const getAsync = promisify(this.client.get).bind(this.client)

		const val = await getAsync(key)
		if (val) { this.hits++ } else { this.misses++ }
		return val
	}

	async set(key, value, ttl) {
		const setexAsync = promisify(this.client.setex).bind(this.client)

		return setexAsync(key, Math.floor(ttl || this.defaultTtl), value)
	}

	getStats() {
		return { hits: this.hits, misses: this.misses, type: 'redis' }
	}
}

module.exports = PoracleRedisCache