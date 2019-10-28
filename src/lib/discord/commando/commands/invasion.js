exports.run = async (client, msg, command) => {
	const typeArray = Object.keys(client.utilData.types).map((o) => o.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }


	try {
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((args) => args.find((arg) => arg.match(/name\S+/gi)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(/name\S+/gi))
		if (webhookName) webhookName = webhookName.replace('name', '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(/name/gi, ''), webhook: true }

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'} ${client.translator.translate('add')} <Your-Webhook-url>`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}channel add`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return await msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}
		if (target.webhook) target.id = isRegistered.id

		let reaction = '👌'
		for (const args of command) {
			const remove = !!args.find((arg) => arg === 'remove')
			let distance = 0
			let template = 1
			let gender = 0
			let clean = false
			let types = args.filter((arg) => typeArray.includes(arg))
			const pings = [...msg.mentions.users.array().map((u) => `<@!${u.id}>`), ...msg.mentions.roles.array().map((r) => `<@&${r.id}>`)].join('')

			args.forEach((element) => {
				if (element.match(client.re.templateRe)) template = element.match(client.re.templateRe)[0].replace(client.translator.translate('template'), '')
				else if (element.match(client.re.dre)) distance = element.match(client.re.dre)[0].replace(client.translator.translate('d'), '')
				else if (element === 'female') gender = 2
				else if (element === 'male') gender = 1
				else if (element === 'clean') clean = true
				else if (element === 'everything') {
					types = typeArray
					types.push('mixed')
				} else if (element === 'mixed') types.push(element)
			})

			if (!remove) {
				const insertData = types.map((o) => ({
					id: target.id,
					ping: pings,
					template,
					distance,
					gender,
					clean,
					grunt_type: o,
				}))
				const result = await client.query.insertOrUpdateQuery(insertData)
				client.log.info(`${target.name} started tracking ${types.join(', ')} invasions`)
				reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			} else {
				client.query.deleteWhereInQuery('incident', target.id, types, 'grunt_type')
				client.log.info(`${target.name} deleted ${types.join(', ')} ivasions`)
			}
		}
		await msg.react(reaction)
	} catch (err) {
		client.log.error('invasion command unhappy:', err)
	}
}