exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		if (!client.config.discord.admins.includes(msg.author.id)) return

		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		if (!msg.guild.me.hasPermission('MANAGE_WEBHOOKS')) {
			return await msg.reply('I have not been allowed to make webhooks!')
		}

		await msg.author.send(`This is ${msg.channel.type} Channel: ${msg.channel.name}`)

		if (args[0] == 'list') {
			const hooks = await msg.channel.fetchWebhooks()
			hooks.forEach((hook) => {
				msg.author.send(`${hook.name} ${hook.id} ${hook.url}`)
			})
			return
		}

		const webhookName = msg.channel.name
		let webhookLink

		if (args[0] == 'create' || args[0] == 'add') {
			const res = await msg.channel.createWebhook('Poracle')
			await msg.author.send(`I created ${res.name} ${res.id} ${res.url}`)
			webhookLink = res.url
		}

		if (args[0] == 'add') {
			target = { id: webhookLink, name: webhookName, webhook: true }
			const isRegistered = await client.query.countQuery('humans', { name: webhookName })
			if (isRegistered) {
				await msg.author.send(`A webhook or channel with the name ${webhookName} already exists`)

				return await msg.react('👌')
			}

			await client.query.insertQuery('humans', {
				id: target.id,
				type: 'webhook',
				name: target.name,
				area: '[]',
			})
			await msg.react('✅')
		}
	} catch (err) {
		client.logs.log.error(`Webhook command "${msg.content}" unhappy:`, err)
	}
}
