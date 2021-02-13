exports.run = async (client, msg, args) => {
	// Check target
	const util = client.createUtil(msg, args)

	const {
		canContinue, target,
	} = await util.buildTarget(args)

	if (!canContinue) return

	const targets = []
	if (msg.isFromAdmin()) {
		// Make list of ids
		const mentions = msg.getMentions()
		targets.push(mentions.map((x) => x.id))
		targets.push(args.filter((x) => parseInt(x, 10)))
	} else {
		targets.push(target.id)
	}

	for (const t of targets) {
		try {
			const isRegistered = await client.query.countQuery('humans', { id: t })
			if (!isRegistered) await msg.react('👌')
			await msg.react('✅')
			await client.query.deleteQuery('egg', { id: t })
			await client.query.deleteQuery('monsters', { id: t })
			await client.query.deleteQuery('raid', { id: t })
			await client.query.deleteQuery('quest', { id: t })
			await client.query.deleteQuery('humans', { id: t })
			client.log.info(`${msg.userId} unregistered ${t}`)
		} catch (err) {
			client.log.error('Unregister command failed with: ', err)
		}
	}
}