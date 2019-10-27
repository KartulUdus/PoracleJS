exports.run = (client, msg) => {
	const targets = []

	if (client.config.discord.admins.includes(msg.author.id)) {
		msg.mentions.users.array().forEach((user) => targets.push({ id: user.id, name: user.tag }))
		msg.mentions.channels.array().forEach((channel) => targets.push({ id: channel.id, name: channel.name }))
	}
	if (!targets.length) targets.push({ id: msg.author.id, name: msg.author.tag })
	targets.forEach(async (target) => {
		try {
			const isRegistered = await client.query.countQuery('humans', { id: target.id })
			if (!isRegistered) return await msg.react('👌')
			await msg.react('✅')
			await client.query.deleteQuery('egg', { id: target.id })
			await client.query.deleteQuery('monsters', { id: target.id })
			await client.query.deleteQuery('raid', { id: target.id })
			await client.query.deleteQuery('quest', { id: target.id })
			await client.query.deleteQuery('humans', { id: target.id })
			client.log.info(`${msg.author.tag} unregistered ${target.name}`)
		} catch (err) {
			client.log.error('Unregister command failed with: ', err)
		}
	})
}