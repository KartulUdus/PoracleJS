module.exports = async (fastify, options, next) => {
	fastify.get('/api/config/poracleWeb', options, async (req) => {
		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		return {
			status: 'ok',
			locale: fastify.config.general.locale,
			providerURL: fastify.config.geocoding.providerURL,
			staticKey: fastify.config.geocoding.staticKey,
			pvpFilterMaxRank: fastify.config.pvp.pvpFilterMaxRank,
			pvpFilterGreatMinCP: fastify.config.pvp.pvpFilterGreatMinCP,
			pvpFilterUltraMinCP: fastify.config.pvp.pvpFilterUltraMinCP,
			defaultTemplateName: fastify.config.general.defaultTemplateName,
			admins: {
				discord: fastify.config.discord.admins,
				telegram: fastify.config.telegram.admins,
			}
		}
	})
	next()
}