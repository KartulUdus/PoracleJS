module.exports = async (fastify, options, next) => {
	fastify.post('/api/import/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}
		const { id } = req.params
		const { body } = req

		const { profile, human, ...rest } = body

		await fastify.query.updateQuery('humans', {
			area: human.area,
			latitude: human.latitude,
			longitude: human.longitude,
		}, { id })
		await fastify.query.deleteQuery('profiles', { id })
		await fastify.query.insertQuery('profiles', profile.map((x) => ({ ...x, id })))
		await Promise.all(Object.keys(rest).map(async (key) => {
			try {
				const dbKey = { nest: 'nests', lure: 'lures', pokemon: 'monsters' }[key] || key
				await fastify.query.deleteQuery(dbKey, { id })
				await fastify.query.insertQuery(dbKey, body[key].map((track) => ({
					ping: '',
					...track,
					id,
				})))
			} catch (e) {
				return { status: 'error', message: e.message }
			}
		}))
		return {
			status: 'ok',
			message: 'Import successful',
		}
	})
	next()
}
