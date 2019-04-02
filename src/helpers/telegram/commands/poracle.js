const emojiStrip = require('emoji-strip')

module.exports = (ctx) => {

	const { controller } = ctx.state
	const user = ctx.update.message.from

	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	if (ctx.update.message.chat.type !== 'group' && channelName.toLowerCase() !== ctx.state.controller.config.telegram.channel.toLowerCase()) {
		return controller.log.log({ level: 'info', message: `${ctx.update.message.from.username} tried to register in ${channelName}`, event: 'telegram:registerFail' })
	}
	controller.query.countQuery('id', 'humans', 'id', user.id)
		.then((isregistered) => {
			if (isregistered) {
				ctx.reply('👌')
					.catch((O_o) => {
						controller.log.error(O_o.message)
					})
			}
			if (!isregistered) {
				controller.query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[user.id, emojiStrip(user.first_name.toLowerCase()), '[]']]).catch((O_o) => {})
				ctx.reply('✅').catch((O_o) => {
					controller.log.error(O_o.message)
				})
				const greeting = controller.dts.greeting.embed
				let message = greeting.description
				greeting.fields.forEach((field) => {
					message = message.concat(`\n\n${field.name}\n\n${field.value}`)
				})

				ctx.telegram.sendMessage(user.id, message, { parse_mode: 'Markdown' }).catch((O_o) => {
					controller.log.error(O_o.message)
					if (O_o.status === 403) {
						ctx.reply('I tried to send a `/help` message to you, but was not allowed to. Please send `/start` to me in DM first')
					}
				})
				controller.log.log({ level: 'debug', message: `${user.first_name} registered`, event: 'telegram:registered' })
			}
		})
		.catch((err) => {
			controller.log.error(`Telegram commando /poracle errored with: ${err.message}`)
		})

}