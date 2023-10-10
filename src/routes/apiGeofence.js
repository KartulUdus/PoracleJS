const geofenceTileGenerator = require('../lib/geofenceTileGenerator')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/geofence/:area/map', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.config.geocoding.staticProvider.toLowerCase() !== 'tileservercache' || !fastify.config.geocoding.staticProviderURL.startsWith('http')) {
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
			fastify.logger.error(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`, err)
			return {
				status: 'error',
			}
		}
	})

	fastify.get('/api/geofence/distanceMap/:lat/:lon/:distance', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.config.geocoding.staticProvider.toLowerCase() !== 'tileservercache' || !fastify.config.geocoding.staticProviderURL.startsWith('http')) {
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
			const url = await geofenceTileGenerator.generateDistanceTile(
				fastify.query.tileserverPregen,
				lat,
				lon,
				distance,
			)
			return {
				status: 'ok',
				url,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.get('/api/geofence/locationMap/:lat/:lon', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		if (fastify.config.geocoding.staticProvider.toLowerCase() !== 'tileservercache' || !fastify.config.geocoding.staticProviderURL.startsWith('http')) {
			return {
				status: 'error',
				message: 'Unsupported configuration for staticProvider',
			}
		}

		try {
			const url = await geofenceTileGenerator.generateLocationTile(
				fastify.query.tileserverPregen,
				req.params.lat,
				req.params.lon,
			)
			return {
				status: 'ok',
				url,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`, err)
			return {
				status: 'error',
			}
		}
	})

	fastify.get('/api/geofence/all/hash', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

	fastify.get('/api/geofence/all', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		return {
			status: 'ok',
			geofence: fastify.geofence,
		}
	})

	fastify.get('/api/geofence/all/geojson', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		const outGeoJSON = {
			type: 'FeatureCollection',
			features: [],
		}
		const inGeoJSON = fastify.geofence

		for (let i = 0; i < inGeoJSON.length; i++) {
			const inGeofence = inGeoJSON[i]
			const outGeofence = {
				type: 'Feature',
				properties: {
					name: inGeofence.name || '',
					color: inGeofence.color || '#000000',
					id: inGeofence.id || 0,
					group: inGeofence.group || '',
					description: inGeofence.description || '',
					userSelectable: inGeofence.userSelectable ?? true,
					displayInMatches: inGeofence.displayInMatches ?? true,
				},
				geometry: {
					type: inGeofence.multipath ? 'MultiPolygon' : 'Polygon',
					coordinates: [],
				},
			}
			const outPath = []
			if (inGeofence.multipath) {
				for (let j = 0; j < inGeofence.multipath.length; j++) {
					const path = inGeofence.multipath[j]
					const outSubPath = []
					for (let k = 0; k < path.length; k++) {
						const coord = path[k]
						outSubPath.push([coord[1], coord[0]])
					}
					if (outSubPath.at(-1)[0] !== outSubPath[0][0] || outSubPath.at(-1)[1] !== outSubPath[0][1]) {
						outSubPath.push(outSubPath[0])
					}
					outPath.push(outSubPath)
				}
			} else {
				for (let j = 0; j < inGeofence.path.length; j++) {
					const coord = inGeofence.path[j]
					outPath.push([coord[1], coord[0]])
				}
				if (outPath.at(-1)[0] !== outPath[0][0] || outPath.at(-1)[1] !== outPath[0][1]) {
					outPath.push(outPath[0])
				}
			}
			outGeofence.geometry.coordinates.push(outPath)
			outGeoJSON.features.push(outGeofence)
		}

		return {
			status: 'ok',
			geoJSON: outGeoJSON,
		}
	})

	next()
}
