exports.run = async (client, msg, args) => {
	const typeArray = Object.keys(client.utilData.types).map(o => o.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send('Please run commands in Direct Messages')
		}
		let webhookName = args.find(arg => arg.match(/name\S+/gi))
		if (webhookName) webhookName = webhookName.replace('name', '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) {
			target = { name: webhookName.replace(/name/gi, ''), webhook: true }
			msg.content = msg.content.replace(client.hookRegex, '')
		}

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'}  add <Your-Webhook-url>`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {})
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}
		if (target.webhook) target.id = isRegistered.id

		const argTypes = args.filter(arg => typeArray.includes(arg))

		let monsters = []
		monsters = Object.values(client.monsters).filter(mon => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
		|| mon.types.map(t => t.name.toLowerCase()).find(t => argTypes.includes(t)) || args.includes('everything'))
		&& !mon.form.id)

		const monsterIds = monsters.map(mon => mon.id)
		const result = await client.query.deleteWhereInQuery('monsters', target.id, monsterIds, 'pokemon_id')

		result.length ? await msg.react('✅') : await msg.react('👌')
	} catch (err) {
		client.log.error('untrack command unhappy:', err)
	}
}