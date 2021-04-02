exports.run = async (client, msg, [args]) => {
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
				msg.author.send(`${hook.name} | ${hook.url}`)
			})
			return
		}

		let webhookName = args.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) [,, webhookName] = webhookName.match(client.re.nameRe)

		if (!webhookName) webhookName = msg.channel.name

		let webhookLink

		if (args[0] == 'add') {
			const isRegistered = await client.query.countQuery('humans', { name: webhookName })
			if (isRegistered) {
				await msg.author.send(`A webhook or channel with the name ${webhookName} already exists`)

				return await msg.react('👌')
			}
		}

		if (args[0] == 'create' || args[0] == 'add') {
			const hooks = await msg.channel.fetchWebhooks()
			hooks.forEach((hook) => {
				if (hook.name == 'Poracle') webhookLink = hook.url
			})

			if (webhookLink) {
				await msg.author.send(`There is an existing Poracle webhook ${webhookLink}`)
			} else {
				const res = await msg.channel.createWebhook('Poracle')
				await msg.author.send(`I created a new webhook ${res.name} ${res.url}`)
				webhookLink = res.url
			}
		}

		if (args[0] == 'add') {
			if (webhookName.includes('_')) {
				await msg.author.send('A poracle webhook name cannot contain an underscore (_) - use name parameter to override')

				return await msg.react('👌')
			}
			const isRegistered = await client.query.countQuery('humans', { name: webhookName })
			if (isRegistered) {
				await msg.author.send(`A webhook or channel with the name ${webhookName} already exists`)

				return await msg.react('👌')
			}

			await client.query.insertQuery('humans', {
				id: webhookLink,
				type: 'webhook',
				name: webhookName,
				area: '[]',
			})
			await msg.react('✅')
		}
	} catch (err) {
		client.logs.log.error(`Webhook command "${msg.content}" unhappy:`, err)
	}
}
