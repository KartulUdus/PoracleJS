exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id)) {
			return await msg.react('🙅')
		}
		// if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
		// 	return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		// }

		let webhookName = args.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) [,, webhookName] = webhookName.match(client.re.nameRe)
		const webhookLink = msg.content.match(client.hookRegex) ? msg.content.match(client.hookRegex)[0] : false

		let areaName = args.find((arg) => arg.match(client.re.areaRe))
		if (areaName) {
			[,, areaName] = areaName.match(client.re.areaRe)
			areaName = areaName.toLowerCase()
		}
		const confAreas = client.geofence.map((area) => area.name.toLowerCase()).sort()
		const isValidArea = confAreas.filter((x) => areaName == x)
		if (!isValidArea.length) {
			areaName = ''
		}

		let language = null
		let languageName = args.find((arg) => arg.match(client.re.languageRe))
		if (languageName) {
			[,, languageName] = languageName.match(client.re.languageRe)
			languageName = client.translatorFactory.reverseTranslateCommand(languageName, true)
		}
		let newLanguage = languageName
		const languageMatchByName = Object.keys(client.GameData.utilData.languageNames).find((x) => client.GameData.utilData.languageNames[x] == languageName)
		if (languageMatchByName) {
			newLanguage = languageMatchByName
		}
		if (Object.keys(client.config.general.availableLanguages).includes(newLanguage)) {
			language = newLanguage
		}

		if (msg.channel.type === 'text' && !target.webhook) target = { id: msg.channel.id, name: msg.channel.name, webhook: false }

		if (args.find((arg) => arg === 'add')) {
			if (webhookName && !webhookLink || !webhookName && webhookLink) return await msg.reply('To add webhooks, provide both a name using the `name` parameter and an url')

			if (webhookName && webhookLink) target = { id: webhookLink, name: webhookName, webhook: true }

			const isRegistered = await client.query.countQuery('humans', { id: target.id })

			if (isRegistered) return await msg.react('👌')

			await client.query.insertQuery('humans', {
				id: target.id,
				type: target.webhook ? 'webhook' : 'discord:channel',
				name: target.name,
				area: JSON.stringify([areaName]),
				language,
				community_membership: '[]',
			})
			await msg.react('✅')
			let reply = `${client.translator.translate('Channel added')}`
			if (webhookName) reply = `${client.translator.translate('Webhook added')}`
			if (areaName != '') reply = reply.concat(` ${client.translator.translate('with')} ${client.translator.translate('area')} ${areaName}`)
			if (language) reply = reply.concat(` ${(areaName != '') ? client.translator.translate('and') : client.translator.translate('with')} ${client.translator.translate('language')} ${client.translator.translate(client.GameData.utilData.languageNames[language])}`)
			await msg.reply(reply)
		} else if (args.find((arg) => arg === 'remove')) {
			if (webhookName) {
				const webhookRegistered = await client.query.countQuery('humans', { name: webhookName, type: 'webhook' })
				if (webhookRegistered) {
					await client.query.deleteQuery('humans', { name: webhookName, type: 'webhook' })
					await msg.react('✅')
					return
				}
				return msg.reply('Webhook with that name does not appeared to be registered')
			}

			const isRegistered = await client.query.countQuery('humans', { id: target.id })

			if (!isRegistered && msg.channel.type === 'text') {
				return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('channel')} ${client.translator.translate('add')}`)
			}
			if (isRegistered) {
				await client.query.deleteQuery('humans', { id: target.id })
				await msg.react('✅')
			}
		}
	} catch (err) {
		client.logs.log.error(`Channel command "${msg.content}" unhappy:`, err)
	}
}
