exports.run = async (client, msg, args, options) => {
	try {
		if (!msg.isFromAdmin) {
			return await msg.react('🙅')
		}

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		// Make list of ids
		const mentions = msg.getMentions()
		const targets = mentions.map((x) => x.id)
		targets.push(...(args.filter((x) => parseInt(x, 10))))

		for (const id of targets) {
			client.log.info(`Disable ${id}`)

			await client.query.updateQuery('humans', { admin_disable: 1, disabled_date: null }, { id })
		}
		await msg.react('✅')
	} catch (err) {
		client.log.error(`disable command ${msg.content} unhappy:`, err)
	}
}
