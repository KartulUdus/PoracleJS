exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return

		let helpLanguage = language
		if (client.config.general.availableLanguages) {
			for (const l in client.config.general.availableLanguages) {
				if ({}.hasOwnProperty.call(client.config.general.availableLanguages, l)) {
					const commandName = client.config.general.availableLanguages[l].help
					if (msg.command == commandName) {
						helpLanguage = l
					}
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
			fields.forEach((field) => {
				messageText = messageText.concat(`\n\n${field.name}\n\n${field.value}`)
			})
			await msg.reply(messageText)
		}
	} catch (err) {
		client.log.error('help command unhappy:', err)
	}
}