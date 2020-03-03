exports.run = async (client, msg, command) => {
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

			let exclusive = 0
			let distance = 0
			let team = 4
			let template = 1
			let clean = false
			let levels = []
			const pings = [...msg.mentions.users.array().map((u) => `<@!${u.id}>`), ...msg.mentions.roles.array().map((r) => `<@&${r.id}>`)].join('')


			args.forEach((element) => {
				if (element === 'ex') exclusive = 1
				else if (element.match(client.re.levelRe)) levels.push(element.match(client.re.levelRe)[0].replace(client.translator.translate('level'), ''))
				else if (element.match(client.re.templateRe)) template = element.match(client.re.templateRe)[0].replace(client.translator.translate('template'), '')
				else if (element.match(client.re.dRe)) distance = element.match(client.re.dRe)[0].replace(client.translator.translate('d'), '')
				else if (element === 'instinct') team = 3
				else if (element === 'valor') team = 2
				else if (element === 'mystic') team = 1
				else if (element === 'harmony') team = 0
				else if (element === 'everything') levels = [1, 2, 3, 4, 5]
				else if (element === 'clean') clean = true
			})

			if (!levels.length) {
				break
			} else {
				validTracks += 1
			}

			if (!remove) {
				const insert = levels.map((lvl) => ({
					id: target.id,
					ping: pings,
					exclusive: !!exclusive,
					template,
					distance,
					team,
					clean,
					level: lvl,
				}))

				const result = await client.query.insertOrUpdateQuery('egg', insert)
				client.log.info(`${target.name} started tracking level ${levels.join(', ')} eggs`)
				reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			} else {
				let result = 0
				if (levels.length) {
					const lvlResult = await client.query.deleteWhereInQuery('egg', target.id, levels, 'level')
					client.log.info(`${target.name} stopped tracking level ${levels.join(', ')} eggs`)
					result += lvlResult
				}
				reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			}
		}
		if (!validTracks) return await msg.reply(client.translator.translate('404 No raid egg levels found'))
		await msg.react(reaction)
	} catch (err) {
		client.log.error('raid command unhappy:', err)
	}
}