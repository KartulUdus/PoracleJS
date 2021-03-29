module.exports = async (fastify, options, next) => {
	fastify.post('/api/postMessage', options, async (req, reply) => {
		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (secret !== fastify.config.server.apiSecret) {
			return { webserver: 'unhappy', reason: 'incorrect or missing api secret' }
		}

		let data = req.body
		if (!Array.isArray(data)) data = [data]

		data.forEach((job) => {
			if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
			if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
		})

		if (!reply.sent) return { webserver: 'happy' }
	})
	next()
}