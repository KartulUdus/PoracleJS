exports.run = async (client, msg, args) => {
	try {
		if (!msg.isFromAdmin) {
			return await msg.react('🙅')
		}

		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, language,
		} = await util.buildTarget(args)

		if (!canContinue) return

		const translator = client.translatorFactory.Translator(language)

		await msg.react('✅')

		const humans = await client.query.selectAllQuery('humans', {})
		let response = ''
		for (const human of humans) {
			if (human.type === 'webhook') {
				response = response.concat(`${human.name}. ${human.type} ${human.admin_disable ? '- disabled' : ''}\n`)
			} else {
				response = response.concat(`${human.id}. ${human.type} ${human.name} ${human.admin_disable ? '- disabled' : ''}\n`)
			}
		}
		await msg.reply(`${translator.translate('These users are registered with Poracle:')}\n${response}`)
	} catch (err) {
		client.log.error(`userlist command ${msg.content} unhappy:`, err)
	}
}
