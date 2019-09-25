exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.username, webhook: false }

	try {
		// Check target
		const confAreas = client.geofence.map(area => area.name.toLowerCase().replace(/ /gi, '_')).sort()
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

		for (let i = 0; i < args.length; i++) {
			if (args[i].match(/name\S+/gi)) arr.splice(i, 1)
		}
		const search = args.join(' ')

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


		switch (args[0]) {
			case 'add': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				const oldArea = JSON.parse(human.area.split()).map(area => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter(x => args.includes(x))
				const addAreas = validAreas.filter(x => !oldArea.includes(x))
				const newAreas = [...oldArea, ...addAreas].filter(area => validAreas.includes(area))
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
				const oldArea = JSON.parse(human.area.split()).map(area => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter(x => args.includes(x))
				const removeAreas = validAreas.filter(x => oldArea.includes(x))
				const newAreas = [...oldArea].filter(area => validAreas.includes(area) && !removeAreas.includes(area))
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
				await msg.reply(`Current configured areas are ${confAreas}`)
				break
			}
			default:
		}
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}