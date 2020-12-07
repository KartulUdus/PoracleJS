exports.run = async (client, msg, command) => {
	const typeArray = Object.values(client.utilData.gruntTypes).map((grunt) => grunt.type.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((args) => args.find((arg) => arg.match(client.re.nameRe)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(client.re.nameRe, ''), webhook: true }

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('webhook')} ${client.translator.translate('add')} ${client.translator.translate('<Your-Webhook-url>')}`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}channel add`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return await msg.react(client.translator.translate('🙅'))
		}
		if (target.webhook) target.id = isRegistered.id

		let validTracks = 0
		let reaction = '👌'
		for (const args of command) {
			const remove = !!args.find((arg) => arg === 'remove')
			let distance = 0
			let template = 1
			let gender = 0
			let clean = false
			const types = args.filter((arg) => typeArray.includes(arg))
			const pings = [...msg.mentions.users.array().map((u) => `<@!${u.id}>`), ...msg.mentions.roles.array().map((r) => `<@&${r.id}>`)].join('')

			for (const element of args) {
				if (element.match(client.re.templateRe)) template = element.match(client.re.templateRe)[0].replace(client.translator.translate('template'), '')
				else if (element.match(client.re.dRe)) distance = element.match(client.re.dRe)[0].replace(client.translator.translate('d'), '')
				else if (element === client.translator.translate('female')) gender = 2
				else if (element === client.translator.translate('male')) gender = 1
				else if (element === client.translator.translate('clean')) clean = true
				else if (typeArray.includes(element) || element === 'everything') types.push(element)
			}
			if (!types.length) {
				break
			} else {
				validTracks += 1
			}
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
				const result = await client.query.insertOrUpdateQuery('invasion', insertData)
				client.log.info(`${target.name} started tracking ${types.join(', ')} invasions`)
				reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			} else {
				client.query.deleteWhereInQuery('invasion', target.id, types, 'grunt_type')
				client.log.info(`${target.name} deleted ${types.join(', ')} ivasions`)
			}
		}

		if (!validTracks) return await msg.reply(client.translator.translate('404 No valid invasion types found'))
		await msg.react(reaction)
	} catch (err) {
		client.log.error('invasion command unhappy:', err)
	}
}
