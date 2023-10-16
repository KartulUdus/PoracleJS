const ProfileLogic = require('../lib/profileLogic')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/profiles/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`)

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

		const profile = await fastify.query.selectAllQuery('profiles', { id: req.params.id })

		return {
			status: 'ok',
			profile,
		}
	})

	fastify.delete('/api/profiles/:id/byProfileNo/:profile_no', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		const profileLogic = new ProfileLogic(fastify.query, req.params.id)
		await profileLogic.deleteProfile(req.params.profile_no)

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/profiles/:id/add', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`)

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

		let insertReq = req.body
		if (!Array.isArray(insertReq)) insertReq = [insertReq]

		const defaultTo = ((value, x) => ((value === undefined) ? x : value))

		const insert = insertReq.map((row) => {
			if (row.name === undefined) {
				throw new Error('name must be specified')
			}

			return {
				name: row.name,
				active_hours: +defaultTo(row.active_hours, '{}'),
			}
		})

		const profileLogic = new ProfileLogic(fastify.query, req.params.id)

		try {
			for (const i of insert) {
				await profileLogic.addProfile(i.name, i.active_hours)
			}

			return {
				status: 'ok',
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.post('/api/profiles/:id/update', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`)

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

		let updateReq = req.body
		if (!Array.isArray(updateReq)) updateReq = [updateReq]

		const defaultTo = ((value, x) => ((value === undefined) ? x : value))

		const updates = updateReq.map((row) => {
			if (row.profile_no === undefined) {
				throw new Error('profile_no must be specified')
			}

			return {
				profile_no: row.profile_no,
				active_hours: defaultTo(row.active_hours, '{}'),
			}
		})

		const profileLogic = new ProfileLogic(fastify.query, req.params.id)

		try {
			for (const i of updates) {
				await profileLogic.updateHours(i.profile_no, i.active_hours)
			}

			return {
				status: 'ok',
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.post('/api/profiles/:id/copy/:from/:to', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`)

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

		const profileLogic = new ProfileLogic(fastify.query, req.params.id)
		try {
			await profileLogic.copyProfile(req.params.from, req.params.to)

			return {
				status: 'ok',
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.routeConfig.method} ${req.routeConfig.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	next()
}
