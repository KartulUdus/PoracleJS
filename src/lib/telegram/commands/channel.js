module.exports = async (ctx) => {
	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	const { controller, command } = ctx.state
	const user = ctx.update.message.from || ctx.update.message.chat

	const [args] = command.splitArgsArray

	try {
		// Check target
		if (!controller.config.telegram.admins.includes(user.id.toString())) return

		let target = { id: ctx.update.message.from.id.toString(), name: ctx.update.message.from.username, channel: false }

		let channelName = args.find((arg) => arg.match(controller.re.nameRe))
		if (channelName) [,, channelName] = channelName.match(controller.re.nameRe)
		const channelRegex = new RegExp('-\\d{1,20}', 'gi')

		const channelId = command.args.match(channelRegex) ? command.args.match(channelRegex)[0] : false

		if (channelName && !channelId || !channelName && channelId) return await ctx.reply('To add a channel, provide both a name and an channel id')
		if (controller.config.telegram.admins.includes(user.id.toString()) && channelName && channelId) target = { id: channelId, name: channelName, channel: true }
		if (controller.config.telegram.admins.includes(user.id.toString()) && ctx.update.message.chat.type !== 'private' && !target.channel) {
			target = { id: ctx.update.message.chat.id.toString(), name: ctx.update.message.chat ? ctx.update.message.chat.title.toLowerCase() : '', channel: false }
		}

		const isRegistered = await controller.query.countQuery('humans', { id: target.id })
		if (args.find((arg) => arg === 'add')) {
			if (isRegistered) return await ctx.reply('👌')

			await controller.query.insertQuery('humans', {
				id: target.id,
				type: target.channel ? 'telegram:channel' : 'telegram:group',
				name: target.name,
				area: '[]',
			})
			await ctx.reply('✅')
		} else if (args.find((arg) => arg === 'remove')) {
			if (!isRegistered) {
				return await ctx.reply(`${target.id} ${controller.translator.translate('does not seem to be registered. add it with')} /${controller.translator.translate('channel')} ${controller.translator.translate('add')}`)
			}
			if (isRegistered) {
				await controller.query.deleteQuery('humans', { id: target.id })
				await ctx.reply('✅')
			}
		}
	} catch (err) {
		controller.logs.telegram.error('Group command "-" unhappy:', err)
	}
}
