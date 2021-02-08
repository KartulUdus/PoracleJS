const helpCommand = require('./help.js')

exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		await client.query.updateQuery('humans', { enabled: 1 }, { id: target.id })
		await msg.react('✅')

		if (platform == 'telegram') {
			// Telegram client auto sends start on bot initialisation, give the user some help
			return helpCommand.run(client, msg, args)
		}
	} catch (err) {
		client.log.error(`start command ${msg.content} unhappy:`, err)
	}
}
