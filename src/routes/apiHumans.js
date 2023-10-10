const communityLogic = require('../lib/communityLogic')
const DiscordUtil = require('../lib/discord/discordUtil')
const DiscordRoleSetter = require('../lib/discord/discordRoleSetter')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/humans/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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
			allowedAreas = communityLogic.filterAreas(
				fastify.config,
				human.community_membership
					? JSON.parse(human.community_membership) : [],
				allowedAreas,
			)
		}

		return {
			status: 'ok',
			areas: fastify.geofence.filter((x) => allowedAreas.includes(x.name.toLowerCase())).map((x) => ({
				name: x.name,
				group: x.group || '',
				description: x.description || '',
				userSelectable: !!(x.userSelectable ?? true),
			})),
		}
	})

	fastify.get('/api/humans/:id/roles', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		if (human.type !== 'discord:user') {
			return []
		}

		const roleSetter = new DiscordRoleSetter(fastify.discordClient, fastify.config, fastify.logger)

		return {
			status: 'ok',
			guilds: await roleSetter.list(human.id),
		}
	})

	fastify.post('/api/humans/:id/roles/add/:roleId', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		if (human.type !== 'discord:user') {
			return []
		}

		const roleSetter = new DiscordRoleSetter(fastify.discordClient, fastify.config, fastify.logger)

		return {
			status: 'ok',
			result: await roleSetter.setRole(human.id, req.params.roleId, true),
		}
	})

	fastify.post('/api/humans/:id/roles/remove/:roleId', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		if (human.type !== 'discord:user') {
			return []
		}

		const roleSetter = new DiscordRoleSetter(fastify.discordClient, fastify.config, fastify.logger)

		return {
			status: 'ok',
			result: await roleSetter.setRole(human.id, req.params.roleId, false),
		}
	})

	fastify.get('/api/humans/:id/getAdministrationRoles', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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
					const dr = new DiscordUtil(
						fastify.discordWorker.client,
						fastify.logger,
						fastify.config,
						fastify.query,
					)

					roles = await dr.getUserRoles(req.params.id)

					const rolesAndId = [...roles, req.params.id]

					let channels
					for (const id of Object.keys(fastify.config.discord.delegatedAdministration.channelTracking)) {
						if (fastify.config.discord.delegatedAdministration.channelTracking[id].some((x) => rolesAndId.includes(x))) {
							if (!channels) {
								channels = await dr.getAllChannels()
							}
							fastify.logger.debug(`getAdministrationRoles - all channels: ${JSON.stringify(channels)}`)

							if (fastify.config.discord.guilds.includes(id)) {
								// push whole guild
								result.discord.channels.push(...channels[id].map((x) => x.id))
							}
							for (const guild of fastify.config.discord.guilds) {
								if (channels[guild]) {
									if (channels[guild].some((x) => x.categoryId === id)) {
										// push whole category
										result.discord.channels.push(...channels[guild].filter((x) => x.categoryId === id).map((x) => x.id))
									}
									if (channels[guild].some((x) => x.id === id)) {
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
						const dr = new DiscordUtil(
							fastify.discordWorker.client,
							fastify.logger,
							fastify.config,
							fastify.query,
						)

						roles = await dr.getUserRoles(req.params.id)
					}

					// Add hooks identified by user
					result.discord.webhooks.push(...Object.keys(fastify.config.discord.delegatedAdministration.webhookTracking).filter((x) => fastify.config.discord.delegatedAdministration.webhookTracking[x].includes(req.params.id)))
					// Add hooks identified by role
					result.discord.webhooks.push(...Object.keys(fastify.config.discord.delegatedAdministration.webhookTracking).filter((x) => fastify.config.discord.delegatedAdministration.webhookTracking[x].some((y) => roles.includes(y))))
				}

				if (fastify.config.discord.delegatedAdministration && fastify.config.discord.delegatedAdministration.userTracking) {
					if (!roles) {
						const dr = new DiscordUtil(
							fastify.discordWorker.client,
							fastify.logger,
							fastify.config,
							fastify.query,
						)

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
			fastify.logger.error(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`, err)
			return {
				status: 'error',
				message: 'Exception raised during execution',
			}
		}
	})

	fastify.get('/api/humans/:id/checkLocation/:lat/:lon', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

	fastify.post('/api/humans/:id/setLocation/:lat/:lon', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}
		const targetId = req.params.id
		const human = await fastify.query.selectOneQuery('humans', { id: targetId })

		if (!human) {
			return {
				status: 'error',
				message: 'User not found',
			}
		}

		const currentProfileNo = human.current_profile_no
		const { lat, lon } = req.params

		if (fastify.config.areaSecurity.enabled && human.area_restriction) {
			const allowedFences = JSON.parse(human.area_restriction)
			const areas = fastify.query.pointInArea([lat, lon])
			if (!allowedFences.some((x) => areas.includes(x))) {
				return {
					status: 'error',
					message: 'Location not permitted',
				}
			}
		}

		await fastify.query.updateQuery('humans', { latitude: lat, longitude: lon }, { id: targetId })
		await fastify.query.updateQuery('profiles', { latitude: lat, longitude: lon }, { id: targetId, profile_no: currentProfileNo })

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/humans/:id/switchProfile/:profile', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		const profileNo = req.params.profile
		const profile = await fastify.query.selectOneQuery('profiles', { id: req.params.id, profile_no: profileNo })

		if (!profile) {
			return {
				status: 'error',
				message: 'Profile not found',
			}
		}

		await fastify.query.updateQuery(
			'humans',
			{
				current_profile_no: profileNo,
				area: profile.area,
				latitude: profile.latitude,
				longitude: profile.longitude,
			},
			{ id: req.params.id },
		)

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/humans/:id/setAreas', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		const areas = req.body.map((x) => x.toLowerCase())

		const targetId = req.params.id
		const currentProfileNo = human.current_profile_no
		const adminTarget = !fastify.config.discord.admins.includes(targetId) || !fastify.config.telegram.admins.includes(targetId)

		let allowedAreas = fastify.geofence
		if (!adminTarget) allowedAreas = allowedAreas.filter((area) => (area.userSelectable === undefined || area.userSelectable))
		allowedAreas = allowedAreas.map((x) => x.name.toLowerCase())
		if (fastify.config.areaSecurity.enabled && !adminTarget) {
			allowedAreas = communityLogic.filterAreas(
				fastify.config,
				human.community_membership
					? JSON.parse(human.community_membership) : [],
				allowedAreas,
			)
		}

		const newAreas = areas.filter((x) => allowedAreas.some((y) => y.toLowerCase() === x))
		const uniqueNewAreas = [...new Set(newAreas)]

		await fastify.query.updateQuery('humans', { area: JSON.stringify(uniqueNewAreas) }, { id: targetId })
		await fastify.query.updateQuery('profiles', { area: JSON.stringify(uniqueNewAreas) }, {
			id: targetId,
			profile_no: currentProfileNo,
		})

		return {
			status: 'ok',
			setAreas: [...uniqueNewAreas],
		}
	})

	fastify.post('/api/humans/:id/start', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		await fastify.query.updateQuery(
			'humans',
			{
				enabled: 1,
			},
			{ id: req.params.id },
		)

		return {
			status: 'ok',
		}
	})

	fastify.post('/api/humans/:id/stop', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		await fastify.query.updateQuery(
			'humans',
			{
				enabled: 0,
			},
			{ id: req.params.id },
		)

		return {
			status: 'ok',
		}
	})

	fastify.get('/api/humans/one/:id', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)

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

		return {
			status: 'ok',
			human,
		}
	})

	next()
}
