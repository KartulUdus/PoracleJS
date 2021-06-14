const helpCommand = require('./help.js')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}
		const translator = client.translatorFactory.Translator(language)

		// Remove arguments that are part of overrides
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		if (args.length) {
			// Assist user who has probably called stop accidentally
			await msg.reply(translator.translateFormat('The {0}{1} command is used to stop all alert messages, is that what you want?', util.prefix, translator.translate('stop')))
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		await client.query.updateQuery('humans', { enabled: 0 }, { id: target.id })
		await msg.reply(translator.translateFormat('All alert messages have been stopped, you can resume them with {0}{1}', util.prefix, translator.translate('start')))
		await msg.react('✅')
	} catch (err) {
		client.log.error(`stop command ${msg.content} unhappy:`, err)
	}
}
