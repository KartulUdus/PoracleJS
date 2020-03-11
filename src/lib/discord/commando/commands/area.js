exports.run = async (client, msg, command) => {
	let target = { id: msg.author.id, name: msg.author.username, webhook: false }
	const [args] = command

	try {
		// Check target
		const confAreas = client.geofence.map((area) => area.name.toLowerCase().replace(/ /gi, '_')).sort()
		const confAreas2 = client.geofence.map((area) => area.name.replace(/ /gi, '_')).sort()
		const confUse = confAreas2.join('\n')
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

		const areaArgs = args.map((a) => a.replace(/ /g, '_'))
		switch (args[0]) {
			case 'add': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				const oldArea = JSON.parse(human.area.split()).map((area) => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter((x) => areaArgs.includes(x))
				const addAreas = validAreas.filter((x) => !oldArea.includes(x))
				const newAreas = [...oldArea, ...addAreas].filter((area) => confAreas.includes(area))
				if (!validAreas.length) {
					return await msg.reply(`no valid areas there, please use one of ${confAreas}`)
				}
				await client.query.updateQuery('humans', { area: JSON.stringify(newAreas) }, { id: target.id })


				if (addAreas.length) {
					await msg.reply(`Added areas: ${addAreas}`)
				} else {
					await msg.react('👌')
				}

				break
			}
			case 'remove': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				const oldArea = JSON.parse(human.area.split()).map((area) => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter((x) => areaArgs.includes(x))
				const removeAreas = validAreas.filter((x) => oldArea.includes(x))
				const newAreas = [...oldArea].filter((area) => confAreas.includes(area) && !removeAreas.includes(area))
				if (!validAreas.length) {
					return await msg.reply(`no valid areas there, please use one of ${confAreas}`)
				}
				await client.query.updateQuery('humans', { area: JSON.stringify(newAreas) }, { id: target.id })


				if (removeAreas.length) {
					await msg.reply(`Removed areas: ${removeAreas}`)
				} else {
					await msg.react('👌')
				}

				break
			}
			case 'list': {
				await msg.reply(`**Current configured areas are:** \`\`\`\n${confUse}\`\`\` `)
				break
			}
			default:
		}
	} catch (err) {
		client.log.error(`area command ${msg.content} unhappy:`, err)
	}
}
