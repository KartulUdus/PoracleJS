module.exports = async (fastify, options, next) => {
	fastify.get('/api/tracking/all/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}
		const human = await fastify.query.selectOneQuery('humans', { id: req.params.id })

		if (!human) {
			return {
				status: 'error',
				message: 'User not found',
			}
		}
		const currentProfileNo = human.current_profile_no
		const { id } = req.params

		const pokemon = await fastify.query.selectAllQuery('monsters', { id, profile_no: currentProfileNo })
		const raid = await fastify.query.selectAllQuery('raid', { id, profile_no: currentProfileNo })
		const egg = await fastify.query.selectAllQuery('egg', { id, profile_no: currentProfileNo })
		const quest = await fastify.query.selectAllQuery('quest', { id, profile_no: currentProfileNo })
		const invasion = await fastify.query.selectAllQuery('invasion', { id, profile_no: currentProfileNo })
		const lure = await fastify.query.selectAllQuery('lures', { id, profile_no: currentProfileNo })
		const nest = await fastify.query.selectAllQuery('nests', { id, profile_no: currentProfileNo })
		const gym = await fastify.query.selectAllQuery('gym', { id, profile_no: currentProfileNo })
		const profile = await fastify.query.selectOneQuery('profiles', { id, profile_no: currentProfileNo })

		return {
			status: 'ok',
			human,
			gym,
			raid,
			egg,
			pokemon,
			invasion,
			lure,
			nest,
			quest,
			profile,
		}
	})

	next()
}
