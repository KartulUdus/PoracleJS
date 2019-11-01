module.exports = async (fastify, options, next) => {
	fastify.post('/', options, async (req, reply) => {
		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		let data = req.body
		if (!Array.isArray(data)) data = [data]

		for (const hook of data) {
			switch (hook.type) {
				case 'pokemon': {
					fastify.webhooks.info('pokemon', hook.message)
					if (fastify.cache.get(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.weight}`)) {
						fastify.logger.warn(`Wild encounter ${hook.message.encounter_id} was sent again too soon, ignoring`)
						break
					}

					fastify.cache.set(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.weight}`, hook)

					const result = await fastify.monsterController.handle(hook.message)
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
					})

					break
				}
				case 'raid': {
					fastify.webhooks.info('raid', hook.message)
					if (fastify.cache.get(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`)) {
						fastify.logger.info(`Raid ${hook.message.encounter_id} was sent again too soon, ignoring`)
						break
					}

					fastify.cache.set(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`, hook)

					const result = await fastify.raidController.handle(hook.message)
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
					})
					break
				}
				case 'invasion':
				case 'pokestop': {
					fastify.webhooks.info('pokestop', hook.message)
					const incidentExpiration = hook.message.incident_expiration ? hook.message.incident_expiration : hook.message.incident_expire_timestamp
					if (!incidentExpiration) break
					if (await fastify.cache.get(`${hook.message.pokestop_id}_${incidentExpiration}`)) {
						fastify.logger.info(`Invasion at ${hook.message.pokestop_id} was sent again too soon, ignoring`)
						break
					}
					fastify.cache.set(`${hook.message.pokestop_id}_${incidentExpiration}`, 'cached')

					const result = await fastify.pokestopController.handle(hook.message)

					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
					})

					break
				}
				case 'quest': {
					fastify.webhooks.info('quest', hook.message)
					if (await fastify.cache.get(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`)) {
						fastify.logger.info(`Quest at ${hook.message.pokestop_name} was sent again too soon, ignoring`)
						break
					}
					fastify.cache.set(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`, 'cached')
					const q = hook.message

					const result = await fastify.questController.handle(q)
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
					})
					break
				}
				case 'weather': {
					fastify.webhooks.info('weather', hook.message)
					await fastify.weatherController.handle(q)
					break
				}
				default:
			}
		}

		if (!reply.sent) return { webserver: 'happy' }
	})
	next()
}