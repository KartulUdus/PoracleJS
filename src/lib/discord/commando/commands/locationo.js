exports.run = async (client, msg, command) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }
	const [args] = command

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
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(client.translator.translate('name'), ''), webhook: true }
		for (let i = 0; i < args.length; i++) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
		}
		const search = args.join(' ')

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

		let lat
		let lon

		const matches = search.match(/^([-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*([-+]?(?:180(\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/)
		if (matches != null && matches.length >= 2) {
			lat = parseFloat(matches[1])
			lon = parseFloat(matches[2])
		} else {
			const locations = await client.query.geolocate(search)
			if (locations === undefined || locations.length == 0) {
				return await msg.react(client.translator.translate('🙅'))
			}
			lat = locations[0].latitude
			lon = locations[0].longitude
		}

		await client.query.updateQuery('humans', { latitude: lat, longitude: lon }, { id: target.id })
		const maplink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
		await msg.reply(`${client.translator.translate(':wave:, I set ')}${target.name}${client.translator.translate('s location to : ')}\n${maplink}`)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}
