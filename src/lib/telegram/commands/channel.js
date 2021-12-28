const communityLogic = require('../../communityLogic')

module.exports = async (ctx) => {
	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	const { controller, command } = ctx.state
	const user = ctx.update.message.from || ctx.update.message.chat

	const [args] = command.splitArgsArray

	try {
		// Check user rights
		let communityList = null
		let areaRestriction = null
		let fullAdmin = false

		if (controller.config.areaSecurity.enabled) {
			const communityAdmin = communityLogic.isTelegramCommunityAdmin(controller.config, user.id.toString())
			if (communityAdmin) {
				communityList = communityAdmin
				areaRestriction = communityLogic.calculateLocationRestrictions(controller.config, communityList)
			}
		}

		if (controller.config.telegram.admins.includes(user.id.toString())) {
			communityList = []
			areaRestriction = null
			fullAdmin = true
		}

		if (!communityList) {
			// Not set a community list - so not a recognised admin
			return
		}

		let target = { id: ctx.update.message.from.id.toString(), name: ctx.update.message.from.username, channel: false }

		let channelName = args.find((arg) => arg.match(controller.re.nameRe))
		if (channelName) [,, channelName] = channelName.match(controller.re.nameRe)
		const channelRegex = /-\d{1,20}/gi

		const channelId = command.args.match(channelRegex) ? command.args.match(channelRegex)[0] : false

		if (channelName && !channelId || !channelName && channelId) return await ctx.reply('To add a channel, provide both a name and an channel id')
		if (channelName && channelId) {
			if (!fullAdmin) {
				return await ctx.reply('You are not a full poracle administrator')
			}
			target = { id: channelId, name: channelName, channel: true }
		}

		if (ctx.update.message.chat.type === 'private' && !target.channel) {
			return await ctx.reply('To add a group, please send /channel add in the group')
		}

		if (ctx.update.message.chat.type !== 'private' && !target.channel) {
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
				community_membership: JSON.stringify(communityList),
				area_restriction: areaRestriction ? JSON.stringify(areaRestriction) : null,
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
		controller.logs.telegram.error('Telegram channel command unhappy:', err)
	}
}
