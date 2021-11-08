const TrackingChangeLogic = require('../../trackingChangeLogic')

exports.run = async (client, msg, args, options) => {
	const logReference = Math.random().toString().slice(2, 11)

	try {
		if (!msg.isFromAdmin) return await msg.react('🙅')

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${logReference}: ${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		if (args.length < 2 || !['from', 'to'].includes(args[0])) {
			return await msg.reply(translator.translateFormat('Valid commands are e.g. `{0}copy from <id>`, `{0}copy to <id> <id> <id>`', util.prefix),
				{ style: 'markdown' })
		}

		const trackingChanger = new TrackingChangeLogic(client.config, client.query, client.scannerQuery, translator, client.GameData)

		if (args[0] === 'to') {
			for (let x = 1; x < args.length; x++) {
				const targets = []
				targets.push(...await trackingChanger.resolveId(args[x]))

				for (const destId of targets) {
					await trackingChanger.copy(target.id, currentProfileNo, destId, 0)
				}
			}
		} else {
			// from
			await trackingChanger.copy(args[1], 0, target.id, currentProfileNo)
		}

		await msg.react('✅')
	} catch (err) {
		client.log.error(`addfilter command ${msg.content} unhappy:`, err)
	}
}
