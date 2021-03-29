module.exports = async (fastify, options, next) => {
	fastify.get('/api/getConfig', options, async (req) => {
		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (secret !== fastify.config.server.apiSecret) {
			return { webserver: 'unhappy', reason: 'incorrect or missing api secret' }
		}

		return {
			webserver: 'happy',
			locale: fastify.config.general.locale,
			providerURL: fastify.config.geocoding.providerURL,
			staticKey: fastify.config.geocoding.staticKey,
			pvpFilterMaxRank: fastify.config.pvp.pvpFilterMaxRank,
			pvpFilterGreatMinCP: fastify.config.pvp.pvpFilterGreatMinCP,
			pvpFilterUltraMinCP: fastify.config.pvp.pvpFilterUltraMinCP,
		}
	})
	next()
}