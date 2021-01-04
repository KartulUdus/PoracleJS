module.exports = async (ctx) => {
	const { controller, command } = ctx.state
	const user = ctx.update.message.from || ctx.update.message.chat

	const [args] = command.splitArgsArray
	controller.log.info('group ${args}')

	try {
		// Check target
		if (!controller.config.telegram.admins.includes(user.id.toString()) && ctx.update.message.chat.type !== 'private') {
			return await ctx.reply(controller.translator.translate('Please run commands in Direct Messages'))
		}

		const target = { id: ctx.update.message.chat.id, name: ctx.update.message.chat ? ctx.update.message.chat.title.toLowerCase() : '' }

		const isRegistered = await controller.query.countQuery('humans', { id: target.id })
		if (args.find((arg) => arg === 'add')) {
			if (isRegistered) return await ctx.reply('👌')

			await controller.query.insertQuery('humans', {
				id: target.id,
				type: 'telegram:group',
				name: target.name,
				area: '[]',
			})
			await ctx.reply('✅')
		} else if (args.find((arg) => arg === 'remove')) {
			if (!isRegistered) {
				return await msg.reply(`${target.id} ${controller.translator.translate('does not seem to be registered. add it with')} /${controller.translator.translate('channel')} ${controller.translator.translate('add')}`)
			}
			if (isRegistered) {
				await controller.query.deleteQuery('humans', { id: target.id })
				await ctx.reply('✅')
			}
		}
	} catch (err) {
		controller.log.error('Group command "-" unhappy:', err)
	}
}
