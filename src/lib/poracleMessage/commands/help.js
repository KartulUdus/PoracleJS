exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		let helpLanguage = language
		if (client.config.general.availableLanguages) {
			for (const [key, availableLanguage] of Object.entries(client.config.general.availableLanguages)) {
				if (availableLanguage.help == msg.command) {
					helpLanguage = key
					break
				}
			}
		}

		const human = await client.query.selectOneQuery('humans', { id: target.id })

		if (human && !human.language) {
			await client.query.updateQuery('humans', { language: helpLanguage }, { id: target.id })
		}

		let platform = target.type.split(':')[0]
		if (platform == 'webhook') platform = 'discord'

		let dts = client.dts.find((template) => template.type === 'greeting' && template.platform === platform && template.language == helpLanguage)
		if (!dts) {
			dts = client.dts.find((template) => template.type === 'greeting' && template.platform === platform && template.default)
		}
		if (!dts) {
			await msg.react('🙅')
			return
		}
		const message = dts.template

		if (message.embed) {
			if (message.embed.title) message.embed.title = ''
			if (message.embed.description) message.embed.description = ''
		}

		const view = { prefix: util.prefix }
		const mustache = client.mustache.compile(JSON.stringify(message))
		const greeting = JSON.parse(mustache(view))

		if (platform === 'discord') {
			await msg.reply(greeting)
		} else {
			let messageText = ''
			const { fields } = greeting.embed

			for (const field of fields) {
				const fieldLine = `\n\n${field.name}\n\n${field.value}`
				if (messageText.length + fieldLine.length > 1024) {
					await msg.reply(messageText, { style: 'markdown' })
					messageText = ''
				}
				messageText = messageText.concat(fieldLine)
			}
			await msg.reply(messageText, { style: 'markdown' })
		}
	} catch (err) {
		client.log.error('help command unhappy:', err)
	}
}
