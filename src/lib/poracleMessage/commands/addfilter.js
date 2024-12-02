const FilterLogic = require('../../filters')
const TrackingChangeLogic = require('../../trackingChangeLogic')

exports.run = async (client, msg, args, options) => {
	const logReference = Math.random().toString().slice(2, 11)

	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${logReference}: ${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		if (!await util.commandAllowed(commandName) && !args.find((arg) => arg === 'remove')) {
			await msg.react('🚫')
			return msg.reply(translator.translate('You do not have permission to execute this command'))
		}

		const trackingChanger = new TrackingChangeLogic(client.config, client.query, client.scannerQuery, translator, client.GameData)
		const filterLogic = new FilterLogic(client.config, client.query, trackingChanger)

		let message = ''
		for (const filterName of args) {
			message += await filterLogic.applyFilter(target.id, currentProfileNo, filterName, !msg.isFromAdmin)
		}

		await msg.reply(message)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`addfilter command ${msg.content} unhappy:`, err)
	}
}
