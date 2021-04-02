exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		if (args[0] === 'help') {
			return require('./help.js').run(client, msg, [__filename.slice(__dirname.length + 1, -3)], options)
		}

		const translator = client.translatorFactory.Translator(language)

		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		await client.query.updateQuery('humans', { enabled: 1 }, { id: target.id })
		await msg.react('✅')

		await msg.reply(translator.translateFormat('Your tracking is now activated, send {0}{1} for more information about available commands',
			util.prefix, translator.translate('help')))
	} catch (err) {
		client.log.error(`start command ${msg.content} unhappy:`, err)
	}
}
