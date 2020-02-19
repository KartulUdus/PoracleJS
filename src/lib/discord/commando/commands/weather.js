exports.run = async (client, msg, command) => {
	// const typeArray = Object.keys(client.utilData.types).map(o => o.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((args) => args.find((arg) => arg.match(client.re.nameRe)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(client.translator.translate('name'), ''), webhook: true }
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

		const pings = [...msg.mentions.users.array().map((u) => `<@!${u.id}>`), ...msg.mentions.roles.array().map((r) => `<@&${r.id}>`)].join('')
		const clean = command[1] ? command[1].includes('clean') : false
		const template = command[1] && command[1].find((arg) => arg.match(client.re.templateRe)) ? command[1].find((arg) => arg.match(client.re.templateRe))[0].replace(client.translator.translate('template'), '') : 1
		const [location] = await client.query.geolocate(command[0].join(' '))
		if (!location) return await msg.reply(`${client.translator.translate('404 no locations found: ')}${command[0].join(' ')}`)
		const key = client.S2.latLngToKey(location.latitude, location.longitude, 10)
		const cell = client.S2.keyToId(key)
		if (!cell) return await msg.reply(`${client.translator.tranlate('S2 cell not found')}${command[1].join(' ')}: ${location.latitude},${location.longitude}`)
		const conditions = []
		if (command[1]) {
			conditions.push(...Object.keys(client.utilData.types).filter((t) => command[1].includes(t.toLowerCase())).map((name) => client.utilData.types[name].id))
			if (command[1].includes('everything')) conditions.push(0)
		}


		const insert = conditions.map((c) => ({
			id: target.id,
			ping: pings,
			condition: c,
			cell,
			template,
			clean,
		}))

		if (!insert.length) {
			return
		}
		const result = await client.query.insertOrUpdateQuery('weather', insert)
		client.log.info(`${target.name} started tracking weather (${conditions.join()}) changes in ${cell} ${command[0].join()}`)
		return await msg.react(result.length || client.config.database.client === 'sqlite' ? '✅' : '👌')
	} catch (err) {
		client.log.error('weather command unhappy: ', err)
	}
}