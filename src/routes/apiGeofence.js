const geofenceTileGenerator = require('../lib/geofenceTileGenerator')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/geofence/all', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		const promises = fastify.geofence.map((x) => geofenceTileGenerator.generateGeofenceTile(fastify.geofence, fastify.query.tileserverPregen, x.name).catch((e) => e))

		const resultUrls = await Promise.all(promises)

		const results = {}
		for (let i = 0; i < fastify.geofence.length; i++) {
			results[fastify.geofence[i].name] = resultUrls[i]
		}

		return {
			status: 'ok',
			areas: results,
		}
	})

	next()
}