exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		if (!Object.keys(client.config.general.availableLanguages).length) {
			return await msg.react('🙅')
		}

		const translator = client.translatorFactory.Translator(language)

		// Remove arguments that we don't want to keep for processing
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		const currentLanguageName = client.GameData.utilData.languageNames[language]

		if (args.length == 0) {
			await msg.reply(`${translator.translate('Current language is set to')}: ${currentLanguageName || language}`)
			await msg.reply(translator.translateFormat('Use `{0}language` to set to one of {1}', util.prefix, Object.keys(client.config.general.availableLanguages)),
				{ style: 'markdown' })
			return
		}

		let newLanguage = args[0]
		let newLanguageName = client.GameData.utilData.languageNames[args[0]]

		const languageMatchByName = Object.keys(client.GameData.utilData.languageNames).find((x) => client.GameData.utilData.languageNames[x] == args[0])
		if (languageMatchByName) {
			newLanguage = languageMatchByName
			newLanguageName = client.GameData.utilData.languageNames[newLanguage]
		}

		if (!Object.keys(client.config.general.availableLanguages).includes(newLanguage)) {
			return msg.reply(`${translator.translate('I only recognise the following languages')}: ${Object.keys(client.config.general.availableLanguages)}`)
		}

		const newTranslator = client.translatorFactory.Translator(newLanguage)

		await client.query.updateQuery('humans', { language: newLanguage }, { id: target.id })

		await msg.reply(`${newTranslator.translate('I have changed your language setting to')}: ${newTranslator.translate(newLanguageName)}`)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}
