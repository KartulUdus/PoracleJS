exports.run = async (client, msg, args, options) => {
	// Check target
	const util = client.createUtil(msg, options)

	const {
		canContinue, target,
	} = await util.buildTarget(args)

	if (!canContinue) return
	client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

	const targets = []
	if (msg.isFromAdmin) {
		// Make list of ids
		const mentions = msg.getMentions()
		targets.push(...(mentions.map((x) => x.id)))
		targets.push(...(args.filter((x) => parseInt(x, 10))))
		if (!targets.length) {
			return msg.reply('No-one to unregister: as an admin I won\'t let you unregister yourself')
		}
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
			await client.query.deleteQuery('lures', { id: t })
			await client.query.deleteQuery('forts', { id: t })
			await client.query.deleteQuery('gym', { id: t })
			await client.query.deleteQuery('invasion', { id: t })
			await client.query.deleteQuery('nests', { id: t })
			await client.query.deleteQuery('weather', { id: t })
			await client.query.deleteQuery('humans', { id: t })
			await client.query.deleteQuery('profiles', { id: t })
			client.log.info(`${msg.userId} unregistered ${t}`)
		} catch (err) {
			client.log.error('Unregister command failed with: ', err)
		}
	}
}
