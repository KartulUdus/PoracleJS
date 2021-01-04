exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, isRegistered, userHasLocation, userHasArea,
		} = await util.buildTarget(args)

		if (!canContinue) return

		await client.query.updateQuery('humans', { enabled: 1 }, { id: target.id })
		await msg.react('✅')
	} catch (err) {
		client.log.error(`start command ${msg.content} unhappy:`, err)
	}
}
