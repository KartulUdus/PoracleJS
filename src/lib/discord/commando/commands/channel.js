exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }


	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName = args.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		const webhookLink = msg.content.match(client.hookRegex) ? msg.content.match(client.hookRegex)[0] : false


		if (webhookName && !webhookLink || !webhookName && webhookLink) return await msg.reply('To add webhooks, provide both a name and an url')
		if (client.config.discord.admins.includes(msg.author.id) && webhookName && webhookLink) target = { id: webhookLink, name: webhookName, webhook: true }
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text' && !target.webhook) target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		const isRegistered = await client.query.countQuery('humans', { id: target.id })
		if (args.find((arg) => arg === 'add')) {
			if (isRegistered) return await msg.react('👌')

			await client.query.insertQuery('humans', {
				id: target.id,
				type: target.webhook ? 'webhook' : 'discord:channel',
				name: target.name,
				area: '[]',
			})
			await msg.react('✅')
		} else if (args.find((arg) => arg === 'remove')) {
			if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
				return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('webhook')} ${client.translator.translate('add')} ${client.translator.translate('<Your-Webhook-url>')} ${client.translator.translate('nameYourWebhookName')} nameYourWebhookName`)
			}
			if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
				return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('channel')} ${client.translator.translate('add')}`)
			}
			if (isRegistered) {
				await client.query.deleteQuery('humans', { id: target.id })
				await msg.react('✅')
			}
		}
	} catch (err) {
		client.log.error(`Channel command "${msg.content}" unhappy:`, err)
	}
}
