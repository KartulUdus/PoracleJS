class PoracleTelegramMessage {
	constructor(ctx) {
		this.ctx = ctx
		this.config = ctx.state.controller.config

		this.user = ctx.update.message.from || ctx.update.message.chat
		this.userId = this.user.id
		this.userName = this.user.username

		this.prefix = '/'
	}

	get isFromAdmin() {
		return (!this.config.telegram.admins.includes(this.userId.toString()))
	}

	get isDM() {
		return this.ctx.update.message.chat.type === 'private'
	}

	async reply(message) {
		return this.ctx.reply(message, {
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
		})
	}

	async react(message) {
		return this.ctx.reply(message)
	}

	async replyByDM(message) {
		// return this.msg.author.send(message)
	}

	async send(target, message) {

	}
}

module.exports = PoracleTelegramMessage