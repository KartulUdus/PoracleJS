exports.run = async (client, msg) => {
	if (!client.config.discord.channels.includes(msg.channel.id)) {
		return client.log.info(`${msg.author.tag} tried to register in ${msg.channel.name}`)
	}
	try {
		const isRegistered = await client.query.countQuery('humans', { id: msg.author.id })
		if (isRegistered) {
			await msg.react('👌')
		} else {
			await client.query.insertQuery('humans', {
				id: msg.author.id, type: 'discord:user', name: client.emojiStrip(msg.author.username), area: '[]',
			})
			await msg.react('✅')
		}
		const greetingDts = client.dts.find((template) => template.type === 'greeting')
		const view = { prefix: client.config.discord.prefix }
		const greeting = client.mustache.compile(JSON.stringify(greetingDts.template))
		await msg.author.send(JSON.parse(greeting(view)))
		client.log.info(`${client.emojiStrip(msg.author.username)} Registered!`)
	} catch (err) {
		client.log.error('!poracle command errored with:', err)
	}
}
