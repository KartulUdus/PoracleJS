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
		this.commands = {
			getAsync: promisify(this.client.get).bind(this.client),
			setexAsync: promisify(this.client.setex).bind(this.client),
		}
	}

	async get(key) {
		const val = await this.commands.getAsync(key)
		if (val) { this.hits++ } else { this.misses++ }
		return val
	}

	async set(key, value, ttl) {
		return this.commands.setexAsync(key, Math.floor(ttl || this.defaultTtl), value)
	}

	getStats() {
		return { hits: this.hits, misses: this.misses, type: 'redis' }
	}
}

module.exports = PoracleRedisCache