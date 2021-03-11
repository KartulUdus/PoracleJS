exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		if (args[0] === 'help') {
			return require('./help.js').run(client, msg, [__filename.slice(__dirname.length + 1, -3)], options)
		}

		await client.query.updateQuery('humans', { enabled: 0 }, { id: target.id })
		await msg.react('✅')
	} catch (err) {
		client.log.error(`stop command ${msg.content} unhappy:`, err)
	}
}
