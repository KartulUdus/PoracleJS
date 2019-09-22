exports.run = async (client, msg, args) => {
	const typeArray = Object.keys(client.utilData.types).map(o => o.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
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

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'}  add <Your-Webhook-url>`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {})
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return await msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}
		if (target.webhook) target.id = isRegistered.id

		const remove = args.find(arg => arg === 'remove')

		let monsters = []
		let exclusive = 0
		let distance = 0
		let team = 4
		let template = 1
		const levels = []
		let pings = ''

		const formNames = args.filter(arg => arg.match(/form\S/gi)).map(arg => arg.replace('form', ''))
		const argTypes = args.filter(arg => typeArray.includes(arg))

		if (formNames.length) {
			monsters = Object.values(client.monsters).filter(mon => (args.includes(mon.name.toLowerCase())
			|| mon.types.map(t => t.name.toLowerCase()).find(t => argTypes.includes(t)) || args.includes('everything'))
			&& formNames.includes(mon.form.name.toLowerCase()))
		} else {
			monsters = Object.values(client.monsters).filter(mon => (args.includes(mon.name.toLowerCase())
			|| mon.types.map(t => t.name.toLowerCase()).find(t => argTypes.includes(t)) || args.includes('everything'))
			&& !mon.form.id)
		}


		if (!monsters.length && levels.length) return await msg.reply('404 NO MONSTERS FOUND')

		args.forEach((element) => {
			if (element === 'ex') exclusive = 1
			else if (element.match(/level\d{1}/gi)) levels.push(element.match(/level\d{1}/gi)[0].replace(/level/gi, ''))
			else if (element.match(/template\d{1,4}/gi)) template = element.match(/template\d{1,4}/gi)[0].replace(/template/gi, '')
			else if (element.match(/d\d{1,8}/gi)) distance = element.match(/d\d{1,8}/gi)[0].replace(/d/gi, '')
			else if (element.endsWith('ping')) 	pings = pings.concat(element.slice(0, element.length - 'ping'.length))
			else if (element === 'instinct') team = 3
			else if (element === 'valor') team = 2
			else if (element === 'mystic') team = 1
			else if (element === 'harmony') team = 0
		})

		if (!remove) {
			const insert = monsters.map(mon => ({
				id: `"${target.id}"`,
				pokemon_id: mon.id,
				ping: `"${pings}"`,
				exclusive,
				template,
				distance,
				team,
				level: 9000,
				form: mon.form.id,
			}))

			levels.forEach((level) => {
				insert.push({
					id: `"${target.id}"`,
					pokemon_id: 9000,
					ping: `"${pings}"`,
					exclusive,
					template,
					distance,
					team,
					level,
					form: 9000,
				})
			})

			const result = await client.query.insertOrUpdateQuery('raid', insert)
			result.length ? msg.react('✅') : msg.react('👌')
		} else {
			const monsterIds = monsters.map(mon => mon.id)
			let result = 0
			if (monsterIds.length) {
				const monResult = await client.query.deleteWhereInQuery('raid', target.id, monsterIds, 'pokemon_id')
				result += monResult
			}
			if (levels.length) {
				const lvlResult = await client.query.deleteWhereInQuery('raid', target.id, levels, 'level')
				result += lvlResult
			}
			result ? msg.react('✅') : msg.react('👌')
		}
	} catch (err) {
		client.log.error('raid command unhappy:', err)
	}
}