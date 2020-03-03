exports.run = async (client, msg, command) => {
	const typeArray = Object.keys(client.utilData.types).map((o) => o.toLowerCase())
	const [args] = command
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }


	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((argss) => argss.find((arg) => arg.match(client.re.nameRe)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) {
			target = { name: webhookName.replace(client.translator.translate('name'), ''), webhook: true }
		}
		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('webhook')} ${client.translator.translate('add')} ${client.translator.translate('<Your-Webhook-url>')}`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('channel')} ${client.translator.translate('add')}`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return await msg.react(client.translator.translate('🙅'))
		}
		if (target.webhook) target.id = isRegistered.id

		const argTypes = args.filter((arg) => typeArray.includes(arg))

		let monsters = []
		monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
		|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) || args.includes(client.translator.translate('everything')))
		&& !mon.form.id)

		const monsterIds = monsters.map((mon) => mon.id)
		const result = await client.query.deleteWhereInQuery('monsters', target.id, monsterIds, 'pokemon_id')
		client.log.info(`${target.name} removed tracking for monsters: ${monsters.map((m) => m.name).join(', ')}`)

		if (result.length || client.config.database.client === 'sqlite') {
			msg.react('✅')
		} else {
			msg.react('👌')
		}
	} catch (err) {
		client.log.error('untrack command unhappy:', err)
	}
}