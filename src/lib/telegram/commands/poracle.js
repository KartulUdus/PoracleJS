const communityLogic = require('../../communityLogic')

module.exports = async (ctx) => {
	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	const { controller } = ctx.state

	const userName = controller.emojiStrip(`${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name ? ctx.update.message.from.last_name : ''} [${ctx.update.message.from.username ? ctx.update.message.from.username : ''}]`)
	if (ctx.update.message.chat.type === 'private') {
		return controller.logs.log.info(`${userName} tried to register in direct message`)
	}

	const telegramUser = ctx.update.message.from || ctx.update.message.chat

	// const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	// if (ctx.update.message.chat.type === 'private' && channelName.toLowerCase() !== ctx.state.controller.config.telegram.channel.toLowerCase()) {
	// 	return controller.logs.log.info(`${userName} tried to register in ${channelName}`)
	// }

	try {
		const client = ctx.state.controller

		let communityToAdd

		if (client.config.areaSecurity.enabled) {
			for (const community of Object.keys(client.config.areaSecurity.communities)) {
				if (client.config.areaSecurity.communities[community].telegram.channels.includes(ctx.update.message.chat.id.toString())) {
					communityToAdd = community
					break
				}
			}
			if (!communityToAdd) {
				return client.logs.log.info(`${userName} tried to register in ${ctx.update.message.chat.id}`)
			}
		} else if (!client.config.telegram.channels.includes(ctx.update.message.chat.id.toString())) {
			return controller.logs.log.info(`${userName} tried to register in other than prepared register channels ${ctx.update.message.chat.id}`)
		}

		let language = ''

		if (client.config.general.availableLanguages) {
			for (const [key, availableLanguage] of Object.entries(client.config.general.availableLanguages)) {
				if (availableLanguage.poracle == ctx.state.command.command) {
					language = key
					break
				}
			}
		}

		const user = await client.query.selectOneQuery('humans', { id: telegramUser.id })

		if (user) {
			if (user.admin_disable && !user.disabled_date) {
				return await ctx.reply('🙅') // account was disabled by admin, don't let him re-enable
			}

			const update = {}
			let updateRequired = false

			if (!user.enabled) {
				update.enabled = 1
				updateRequired = true
			}

			if (client.config.general.roleCheckMode === 'disable-user') {
				if (user.admin_disable && user.disabled_date) {
					update.admin_disable = 0
					update.disabled_date = null

					updateRequired = true
					client.logs.log.info(`user ${userName} used poracle command to remove admin_disable flag`)
				}
			}

			if (communityToAdd) {
				update.community_membership = JSON.stringify(communityLogic.addCommunity(client.config, user.community_membership ? JSON.parse(user.community_membership) : [], communityToAdd))
				update.area_restriction = JSON.stringify(communityLogic.calculateLocationRestrictions(client.config,
					JSON.parse(update.community_membership)))
				updateRequired = true
			}

			if (updateRequired) {
				await client.query.updateQuery('humans', update, { id: telegramUser.id })
				await ctx.reply('✅')
			} else {
				await ctx.reply('👌')
			}

			//			await client.query.updateQuery('humans', { language: language }, { id: msg.author.id })
		} else {
			await client.query.insertQuery('humans', {
				id: telegramUser.id,
				type: 'telegram:user',
				name: client.emojiStrip(userName || ''),
				language,
				area: '[]',
				community_membership: communityToAdd ? JSON.stringify([communityToAdd.toLowerCase()]) : '[]',
				area_restriction: communityToAdd ? JSON.stringify(communityLogic.calculateLocationRestrictions(client.config, [communityToAdd])) : null,
			})
			await ctx.reply('✅')
		}

		if (client.config.telegram.groupWelcomeText) {
			await ctx.reply(controller.config.telegram.groupWelcomeText, { parse_mode: 'Markdown' })
		}

		const dts = controller.dts.find((template) => template.type === 'greeting' && template.platform === 'telegram' && template.default)
		if (dts) {
			const message = dts.template
			const view = { prefix: '/' }

			let messageText = ''
			if (message.embed) {
				if (message.embed.title) messageText = messageText.concat(`${message.embed.title}\n`)
				if (message.embed.description) messageText = messageText.concat(`${message.embed.description}\n`)
			}

			const compiledMustache = client.mustache.compile(JSON.stringify(message))
			const greeting = JSON.parse(compiledMustache(view))

			const { fields } = greeting.embed
			fields.forEach((field) => {
				messageText = messageText.concat(`\n\n${field.name}\n\n${field.value}`)
			})
			await ctx.telegram.sendMessage(user.id, messageText, { parse_mode: 'Markdown' })
		}
		await ctx.telegram.sendMessage(user.id, 'You are now registered with Poracle', { parse_mode: 'Markdown' })

		client.logs.telegram.info(`${userName} Registered!`)
	} catch (err) {
		controller.logs.telegram.error('!poracle command errored with:', err)
	}
}
