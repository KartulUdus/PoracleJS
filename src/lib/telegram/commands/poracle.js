module.exports = async (ctx) => {
	const { controller } = ctx.state
	const user = ctx.update.message.from || ctx.update.message.chat

	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	if (ctx.update.message.chat.type === 'private' && channelName.toLowerCase() !== ctx.state.controller.config.telegram.channel.toLowerCase()) {
		return controller.log.log({ level: 'info', message: `${ctx.update.message.from.username} tried to register in ${channelName}`, event: 'telegram:registerFail' })
	}

	if (!ctx.state.controller.config.telegram.channels.includes(ctx.update.message.chat.id.toString())) {
		return controller.log.log({ level: 'info', message: `${ctx.update.message.from.username} tried to register in other than prepared (${ctx.state.controller.config.telegram.register_chat}) register channel ${ctx.update.message.chat.id}`, event: 'telegram:registerFail' })
	}
	//	if (ctx.state.controller.config.telegram.register_chat !== '' && ctx.update.message.chat.id.toString() !== ctx.state.controller.config.telegram.register_chat) {
	//		return controller.log.log({ level: 'info', message: `${ctx.update.message.from.username} tried to register in other than prepared (${ctx.state.controller.config.telegram.register_chat}) register channel ${ctx.update.message.chat.id}`, event: 'telegram:registerFail' })
	//	}

	try {
		const isRegistered = await controller.query.countQuery('humans', { id: user.id })
		if (isRegistered) {
			await ctx.reply('👌')
		} else {
			await controller.query.insertQuery('humans', {
				id: user.id, type: 'telegram:user', name: user.username || '', area: '[]',
			})
			await ctx.reply('✅')
		}
		// const greetingDts = controller.dts.find((template) => template.type === 'greeting' && template.default)
		// const view = { prefix: controller.config.discord.prefix }
		// const greeting = controller.mustache.compile(JSON.stringify(greetingDts.template))
		// await ctx.sendMessage(user.id, JSON.parse(greeting(view), { parse_mode: 'Markdown' }))
		await ctx.telegram.sendMessage(user.id, 'You are now registered with Poracle', { parse_mode: 'Markdown' })

		controller.log.info(`${user.username} Registered!`)
	} catch (err) {
		controller.log.error('!poracle command errored with:', err)
	}
}
