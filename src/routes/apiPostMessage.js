module.exports = async (fastify, options, next) => {
	fastify.post('/api/postMessage', options, async (req, reply) => {
		fastify.logger.info(`API: ${req.ip} ${req.context.config.method} ${req.context.config.url}`)

		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		let data = req.body
		if (!Array.isArray(data)) data = [data]

		data = data.map((x) => ({
			lat: x.lat || 0,
			lon: x.lon || 0,
			message: x.message,
			target: x.target,
			type: x.type,
			name: x.name || '',
			tth: x.tth || { hours: 1, minutes: 0, seconds: 0 },
			clean: !!x.clean,
			emoji: x.emoji || '',
			logReference: x.logReference || 'WebApi',
			language: x.language || fastify.config.general.locale,
		}))

		data.forEach((job) => {
			if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
			if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
		})

		if (!reply.sent) return { status: 'ok' }
	})
	next()
}