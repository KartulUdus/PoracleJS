const geofenceTileGenerator = require('../lib/geofenceTileGenerator')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/geofence/:area/map', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.config.geocoding.staticProvider.toLowerCase() != 'tileservercache' || !fastify.config.geocoding.staticProviderURL.startsWith('http')) {
			return {
				status: 'error',
				message: 'Unsupported configuration for staticProvider',
			}
		}

		try {
			const url = await geofenceTileGenerator.generateGeofenceTile(fastify.geofence, fastify.query.tileserverPregen, req.params.area)
			return {
				status: 'ok',
				url,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`, err)
			return {
				status: 'error',
			}
		}
	})

	fastify.get('/api/geofence/distanceMap/:lat/:lon/:distance', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.config.geocoding.staticProvider.toLowerCase() != 'tileservercache' || !fastify.config.geocoding.staticProviderURL.startsWith('http')) {
			return {
				status: 'error',
				message: 'Unsupported configuration for staticProvider',
			}
		}

		const { distance } = req.params
		const { lat } = req.params
		const { lon } = req.params

		if (!distance || distance < 0 || !lat || !lon) {
			return {
				status: 'error',
				message: 'Invalid parameters',
			}
		}

		try {
			const url = await geofenceTileGenerator.generateDistanceTile(fastify.query.tileserverPregen,
				lat, lon, distance)
			return {
				status: 'ok',
				url,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.get('/api/geofence/locationMap/:lat/:lon', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.config.geocoding.staticProvider.toLowerCase() != 'tileservercache' || !fastify.config.geocoding.staticProviderURL.startsWith('http')) {
			return {
				status: 'error',
				message: 'Unsupported configuration for staticProvider',
			}
		}

		try {
			const url = await geofenceTileGenerator.generateLocationTile(fastify.query.tileserverPregen,
				req.params.lat, req.params.lon)
			return {
				status: 'ok',
				url,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`, err)
			return {
				status: 'error',
			}
		}
	})

	fastify.get('/api/geofence/all/hash', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) {
			return {
				webserver: 'unhappy',
				reason: `ip ${req.ip} not in whitelist`,
			}
		}
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) {
			return {
				webserver: 'unhappy',
				reason: `ip ${req.ip} in blacklist`,
			}
		}

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		const areas = {}
		for (const fence of fastify.geofence) {
			areas[fence.name] = require('crypto').createHash('md5').update(JSON.stringify(fence.path)).digest('hex')
		}

		return {
			status: 'ok',
			areas,
		}
	})

	next()
}