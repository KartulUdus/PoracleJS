function getDts(client, language, platform, helpSubject) {
	// 1. Help template, right language, right platform
	let dts = client.dts.find((template) => template.type === 'help' && template.id == helpSubject && template.platform === platform && template.language == language)
	// 2. Help template, right language, platform is empty (ie any platform
	if (!dts) {
		dts = client.dts.find((template) => template.type === 'help' && template.id == helpSubject && template.platform === '' && template.language == language)
	}
	// 3. Help template, right platform, marked as default
	if (!dts) {
		dts = client.dts.find((template) => template.type === 'help' && template.id == helpSubject && template.platform === platform && template.default)
	}
	// 4. Help template, marked as default, platform is empty (ie any platform)
	if (!dts) {
		dts = client.dts.find((template) => template.type === 'help' && template.id == helpSubject && template.platform === '' && template.default)
	}

	return dts
}

function isHelpAvailable(client, language, target, helpSubject) {
	let platform = target.type.split(':')[0]
	if (platform == 'webhook') platform = 'discord'

	return getDts(client, language, platform, helpSubject)
}

async function provideSingleLineHelp(client, msg, util, language, target, commandName) {
	const translator = client.translatorFactory.Translator(language)

	if (isHelpAvailable(client, language, target, commandName)) {
		await msg.reply(translator.translateFormat('Use `{0}{1} {2}` for more details on this command', util.prefix, translator.translate('help'), translator.translate(commandName)), { style: 'markdown' })
	} else {
		await msg.reply(translator.translateFormat('Use `{0}{1}` for more help', util.prefix, translator.translate('help')), { style: 'markdown' })
	}
}

exports.provideSingleLineHelp = provideSingleLineHelp

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

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

		let dts

		if (args[0]) {
			dts = getDts(client, helpLanguage, platform, args[0])
		} else {
			// choose appropriate generalised greeting text
			dts = client.dts.find((template) => template.type === 'greeting' && template.platform === platform && template.language === helpLanguage)
			if (!dts) {
				dts = client.dts.find((template) => template.type === 'greeting' && template.platform === platform && template.default)
			}
			if (!dts) {
				dts = client.dts.find((template) => template.type === 'greeting' && template.platform === '' && template.language === helpLanguage)
			}
			if (!dts) {
				dts = client.dts.find((template) => template.type === 'greeting' && template.platform === '' && template.default)
			}
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
