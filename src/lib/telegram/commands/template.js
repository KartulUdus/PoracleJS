module.exports = async (ctx) => {
	const { controller, command } = ctx.state

	// channel message authors aren't identifieable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	try {
		const target = { id: ctx.update.message.from.id, name: ctx.update.message.from.username }

		// if admin started command, look for a mentioned channel
		if (controller.config.telegram.admins.includes(ctx.update.message.from.id.toString())) {
			command.splitArgsArray.map((splitArgs) => {
				splitArgs.map(async (arg) => {
					if (arg.match(controller.re.channelRe)) {
						target.id = arg.replace(controller.translator.translate('channel'), '')
						let targetChannel
						try {
							targetChannel = await ctx.telegram.getChat(target.id)
							target.name = targetChannel.title
						} catch (e) {
							controller.log.warn(`${arg} unhappy `, e)
							return ctx.reply(`${arg} unhappy`)
						}
					}
				})
			})
		}

		const isRegistered = await controller.query.countQuery('humans', { id: target.id })
		if (!isRegistered) {
			return await ctx.reply(`${target.name} ${controller.translator.translate('does not seem to be registered.')}`)
		}
		// PUT CODE HERE
	} catch (err) {
		controller.log.error('TEMPLATE command unhappy:', err)
	}
}