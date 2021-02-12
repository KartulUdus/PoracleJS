const mustache = require('handlebars')

module.exports = async (ctx) => {
	// channel message authors aren't identifiable, ignore all commands sent in channels
	if (Object.keys(ctx.update).includes('channel_post')) return

	const { controller } = ctx.state

	const userName = `${ctx.update.message.from.first_name} ${ctx.update.message.from.last_name ? ctx.update.message.from.last_name : ''} [${ctx.update.message.from.username ? ctx.update.message.from.username : ''}]`
	if (ctx.update.message.chat.type === 'private') {
		return controller.logs.log.info(`${userName} tried to register in direct message`)
	}

	const user = ctx.update.message.from || ctx.update.message.chat

	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	if (ctx.update.message.chat.type === 'private' && channelName.toLowerCase() !== ctx.state.controller.config.telegram.channel.toLowerCase()) {
		return controller.logs.log.info(`${userName} tried to register in ${channelName}`)
	}

	if (!ctx.state.controller.config.telegram.channels.includes(ctx.update.message.chat.id.toString())) {
		return controller.logs.log.info(`${userName} tried to register in other than prepared register channels ${ctx.update.message.chat.id}`)
	}
	//	if (ctx.state.controller.config.telegram.register_chat !== '' && ctx.update.message.chat.id.toString() !== ctx.state.controller.config.telegram.register_chat) {
	//		return controller.log.log({ level: 'info', message: `${ctx.update.message.from.username} tried to register in other than prepared (${ctx.state.controller.config.telegram.register_chat}) register channel ${ctx.update.message.chat.id}`, event: 'telegram:registerFail' })
	//	}

	try {
		let language = ''

		if (ctx.state.controller.config.general.availableLanguages) {
			for (const [key, availableLanguage] of Object.entries(ctx.state.controller.config.general.availableLanguages)) {
				if (availableLanguage.poracle == ctx.state.command.command) {
					language = key
					break
				}
			}
		}

		const isRegistered = await controller.query.countQuery('humans', { id: user.id })
		if (isRegistered) {
			await ctx.reply('👌')
		} else {
			await controller.query.insertQuery('humans', {
				id: user.id,
				type: 'telegram:user',
				name: userName || '',
				area: '[]',
				language,
			})
			await ctx.reply('✅')
		}

		if (controller.config.telegram.groupWelcomeText) {
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

			const compiledMustache = mustache.compile(JSON.stringify(message))
			const greeting = JSON.parse(compiledMustache(view))

			const { fields } = greeting.embed
			fields.forEach((field) => {
				messageText = messageText.concat(`\n\n${field.name}\n\n${field.value}`)
			})
			await ctx.telegram.sendMessage(user.id, messageText, { parse_mode: 'Markdown' })
		}
		await ctx.telegram.sendMessage(user.id, 'You are now registered with Poracle', { parse_mode: 'Markdown' })

		controller.logs.telegram.info(`${userName} Registered!`)
	} catch (err) {
		controller.logs.telegram.error('!poracle command errored with:', err)
	}
}
