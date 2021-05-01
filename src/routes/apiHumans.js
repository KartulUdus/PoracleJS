const communityLogic = require('../lib/communityLogic')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/humans/:id', options, async (req) => {
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

		let allowedAreas = fastify.geofence.map((x) => x.name.toLowerCase())
		if (fastify.config.areaSecurity.enabled && !fastify.config.discord.admins.includes(req.params.id)
		&& !fastify.config.telegram.admins.includes(req.params.id)) {
			allowedAreas = communityLogic.filterAreas(fastify.config, human.community_membership
				? JSON.parse(human.community_membership) : [],
			allowedAreas)
		}

		return {
			status: 'ok',
			areas: fastify.geofence.filter((x) => allowedAreas.includes(x.name.toLowerCase())).map((x) => ({ name: x.name, group: x.group || '' })),
		}
	})

	fastify.get('/api/humans/:id/checkLocation/:lat-:lon', options, async (req) => {
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

		if (!fastify.config.areaSecurity.enabled) {
			return {
				status: 'ok',
				locationOk: true,
			}
		}

		const allowedFences = JSON.parse(human.area_restriction)
		const areas = fastify.query.pointInArea([req.params.lat, req.params.lon])

		return {
			status: 'ok',
			locationOk: allowedFences.some((x) => areas.includes(x)),
		}
	})

	next()
}