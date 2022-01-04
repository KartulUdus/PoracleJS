const PoracleRedisCache = require('./redisCache')
const PoracleNodeCache = require('./standardCache')

function createCache(config, ttl) {
	if (config.database.cache === 'redis') {
		return new PoracleRedisCache(
			ttl,
			config.database.redis.host,
			config.database.redis.port,
			config.database.redis.database,
			config.database.redis.user,
			config.database.redis.password,
			config.database.redis.prefix,
		)
	}

	return new PoracleNodeCache(ttl)
}

exports.createCache = createCache