exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const translator = client.translatorFactory.Translator(language)

		if (args.length == 0) {
			return msg.reply(`${translator.translate('Current language is set to')}: ${language}`)
		}

		let newLanguage = args[0]

		const languageMatchByName = Object.keys(client.utilData.languageNames).find((x) => client.utilData.languageNames[x] == args[0])
		if (languageMatchByName) {
			newLanguage = languageMatchByName
		}

		if (!Object.keys(client.config.general.availableLanguages).includes(newLanguage)) {
			return msg.reply(`${translator.translate('I only recognise the following languages')}: ${Object.keys(client.config.general.availableLanguages)}`)
		}

		const newTranslator = client.translatorFactory.Translator(newLanguage)

		await client.query.updateQuery('humans', { language: newLanguage }, { id: target.id })

		await msg.reply(`${newTranslator.translate('I have changed your language setting to')}: ${newLanguage}`)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}
