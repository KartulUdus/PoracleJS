const communityLogic = require('../lib/communityLogic')
const DiscordUtil = require('../lib/discord/discordUtil')

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

	fastify.get('/api/humans/:id/getAdministrationRoles', options, async (req) => {
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

		try {
			const result = {}

			if (fastify.config.discord.enabled) {
				let roles

				result.discord = {}
				result.discord.channels = []
				result.discord.webhooks = []
				result.discord.users = false

				if (fastify.config.discord.delegatedAdministration && fastify.config.discord.delegatedAdministration.channelTracking
						&& Object.keys(fastify.config.discord.delegatedAdministration.channelTracking).length) {
					const dr = new DiscordUtil(fastify.discordWorker.client,
						fastify.log, fastify.config, fastify.query)

					roles = await dr.getUserRoles(req.params.id)

					const rolesAndId = [...roles, req.params.id]

					let channels
					for (const id of Object.keys(fastify.config.discord.delegatedAdministration.channelTracking)) {
						if (fastify.config.discord.delegatedAdministration.channelTracking[id].some((x) => rolesAndId.includes(x))) {
							if (!channels) {
								channels = await dr.getAllChannels()
							}
							if (fastify.config.discord.guilds.includes(id)) {
								// push whole guild
								result.discord.channels.push(...channels[id].map((x) => x.id))
							}
							for (const guild of fastify.config.discord.guilds) {
								if (channels[guild]) {
									if (channels[guild].some((x) => x.categoryId == id)) {
										// push whole category
										result.discord.channels.push(...channels[guild].filter((x) => x.categoryId == id).map((x) => x.id))
									}
									if (channels[guild].some((x) => x.id == id)) {
										result.discord.channels.push(id)
									}
								}
							}
						}
					}
				}

				if (fastify.config.discord.delegatedAdministration && fastify.config.discord.delegatedAdministration.webhookTracking
					&& Object.keys(fastify.config.discord.delegatedAdministration.webhookTracking).length) {
					if (!roles) {
						const dr = new DiscordUtil(fastify.discordWorker.client,
							fastify.log, fastify.config, fastify.query)

						roles = await dr.getUserRoles(req.params.id)
					}

					// Add hooks identified by user
					result.discord.webhooks.push(...Object.keys(fastify.config.discord.delegatedAdministration.webhookTracking).filter((x) => fastify.config.discord.delegatedAdministration.webhookTracking[x].includes(req.params.id)))
					// Add hooks identified by role
					result.discord.webhooks.push(...Object.keys(fastify.config.discord.delegatedAdministration.webhookTracking).filter((x) => fastify.config.discord.delegatedAdministration.webhookTracking[x].some((y) => roles.includes(y))))
				}

				if (fastify.config.discord.delegatedAdministration && fastify.config.discord.delegatedAdministration.userTracking) {
					if (!roles) {
						const dr = new DiscordUtil(fastify.discordWorker.client,
							fastify.log, fastify.config, fastify.query)

						roles = await dr.getUserRoles(req.params.id)
					}

					const rolesAndId = [...roles, req.params.id]

					result.discord.users = fastify.config.discord.delegatedAdministration.userTracking.some((x) => rolesAndId.includes(x))
				}
			}

			if (fastify.config.telegram.enabled) {
				result.telegram = {}
				result.telegram.channels = []
				result.telegram.users = false

				if (fastify.config.telegram.delegatedAdministration && fastify.config.telegram.delegatedAdministration.channelTracking
					&& Object.keys(fastify.config.telegram.delegatedAdministration.channelTracking).length) {
					// Add hooks identified by user
					result.telegram.channels.push(...Object.keys(fastify.config.telegram.delegatedAdministration.channelTracking).filter((x) => fastify.config.telegram.delegatedAdministration.channelTracking[x].includes(req.params.id)))
				}

				if (fastify.config.telegram.delegatedAdministration && fastify.config.telegram.delegatedAdministration.userTracking) {
					result.telegram.users = fastify.config.telegram.delegatedAdministration.userTracking.includes(req.params.id)
				}
			}

			return {
				status: 'ok',
				admin: result,
			}
		} catch (err) {
			fastify.logger.error(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.get('/api/humans/:id/checkLocation/:lat/:lon', options, async (req) => {
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