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
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) {
			target = { name: webhookName.replace(/name/gi, ''), webhook: true }
			msg.content = msg.content.replace(client.hookRegex, '')
		}

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
			const remove = args.find((arg) => arg === 'remove')

			let monsters = []
			let exclusive = 0
			let distance = 0
			let team = 4
			let template = 1
			const levels = []
			const pings = [...msg.mentions.users.array().map((u) => `<@!${u.id}>`), ...msg.mentions.roles.array().map((r) => `<@&${r.id}>`)].join('')
			const formNames = args.filter((arg) => arg.match(client.re.formRe)).map((arg) => arg.replace(client.translator.translate('form'), ''))
			const argTypes = args.filter((arg) => typeArray.includes(arg))

			if (formNames.length) {
				monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && formNames.includes(mon.form.name.toLowerCase())
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && formNames.includes(mon.form.name.toLowerCase())
				|| args.includes('template'))	&& formNames.includes(mon.form.name.toLowerCase()))
			} else {
				monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && !mon.form.id
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && !mon.form.id
				|| args.includes('template'))	&& !mon.form.id)
			}

			const genCommand = args.filter((arg) => arg.match(client.re.genRe))
			const gen = genCommand.length ? client.utilData.genData[+genCommand[0].replace(client.translator.translate('gen'), '')] : 0

			if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)


			if (!monsters.length && levels.length) return await msg.reply(client.translator.translate('404 NO MONSTERS FOUND'))

			args.forEach((element) => {
				if (element === 'ex') exclusive = 1
				else if (element.match(client.re.levelRe)) levels.push(element.match(client.re.levelRe)[0].replace(/level/gi, ''))
				else if (element.match(client.re.templateRe)) template = element.match(client.re.templateRe)[0].replace(/template/gi, '')
				else if (element.match(client.re.dre)) distance = element.match(client.re.dre)[0].replace(/d/gi, '')
				else if (element === client.translator.translate('instinct')) team = 3
				else if (element === client.translator.translate('valor')) team = 2
				else if (element === client.translator.translate('mystic')) team = 1
				else if (element === client.translator.translate('harmony')) team = 0
			})

			if (!remove) {
				const insert = monsters.map((mon) => ({
					id: target.id,
					pokemon_id: mon.id,
					ping: pings.lenght ? pings : '""',
					exclusive: !!exclusive,
					template,
					distance,
					team,
					level: 9000,
					form: mon.form.id,
				}))

				levels.forEach((level) => {
					insert.push({
						id: target.id,
						pokemon_id: 9000,
						ping: pings.lenght ? pings : '""',
						exclusive: !!exclusive,
						template,
						distance,
						team,
						level,
						form: 9000,
					})
				})

				const result = await client.query.insertOrUpdateQuery('raid', insert)
				if (result.length) reaction = '✅'
			} else {
				const monsterIds = monsters.map((mon) => mon.id)
				let result = 0
				if (monsterIds.length) {
					const monResult = await client.query.deleteWhereInQuery('raid', target.id, monsterIds, 'pokemon_id')
					result += monResult
				}
				if (levels.length) {
					const lvlResult = await client.query.deleteWhereInQuery('raid', target.id, levels, 'level')
					result += lvlResult
				}
				if (result.length) reaction = '✅'
			}
		}
		await msg.react(reaction)
	} catch (err) {
		client.log.error('raid command unhappy:', err)
	}
}