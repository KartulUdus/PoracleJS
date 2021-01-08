const helpCommand = require('./help.js')

exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return

		await client.query.updateQuery('humans', { enabled: 1 }, { id: target.id })
		await msg.react('✅')

		return helpCommand.run(client, msg, args)
	} catch (err) {
		client.log.error(`start command ${msg.content} unhappy:`, err)
	}
}
