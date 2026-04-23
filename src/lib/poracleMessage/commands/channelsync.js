const TrackingChangeLogic = require('../../trackingChangeLogic')
const FilterLogic = require('../../filters')
const channelConfig = require('../../channelConfig')

exports.run = async (client, msg, args, options) => {
	const logReference = Math.random().toString().slice(2, 11)

	try {
		if (!msg.isFromAdmin) return await msg.react('🙅')

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${logReference}: ${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		const trackingChanger = new TrackingChangeLogic(client.config, client.query, client.scannerQuery, translator, client.GameData)
		const filterLogic = new FilterLogic(client.config, client.query, trackingChanger)

		await channelConfig(trackingChanger, filterLogic)

		await msg.react('✅')
	} catch (err) {
		client.log.error(`channelsync command ${msg.content} unhappy:`, err)
	}
}
