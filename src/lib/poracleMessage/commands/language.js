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

		const newLanguage = args[0]

		if (!client.config.language.commandLanguages.includes(newLanguage)) {
			return msg.reply(`${translator.translate('I only recognise the following languages')}: ${client.config.language.commandLanguages}`)
		}

		const newTranslator = client.translatorFactory.Translator(newLanguage)

		await client.query.updateQuery('humans', { language: newLanguage }, { id: target.id })

		await msg.reply(`${newTranslator.translate('I have changed your language setting to')}: ${newLanguage}`)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}
