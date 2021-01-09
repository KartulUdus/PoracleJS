const fs = require('fs')

class PoracleTelegramMessage {
	constructor(ctx) {
		this.ctx = ctx
		this.config = ctx.state.controller.config

		this.user = ctx.update.message.from || ctx.update.message.chat
		this.userId = this.user.id
		this.userName = this.user.username

		this.prefix = '/'
	}

	// eslint-disable-next-line class-methods-use-this
	getPings() {
		return ''
	}

	get isFromAdmin() {
		return (this.config.telegram.admins.includes(this.userId.toString()))
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

	async replyWithAttachment(message, filename) {
		const document = fs.readFileSync(filename)
		this.ctx.reply(message, {
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
		})
		return this.ctx.telegram.sendDocument(this.user.id, { source: document, filename: 'tracked.txt' })
	}

	async react(message) {
		return this.ctx.reply(message)
	}

	async replyByDM(message) {
		return this.ctx.telegram.sendMessage(this.userId, message)
	}

	async send(target, message) {
		return this.ctx.telegram.sendMessage(target, message)
	}
}

module.exports = PoracleTelegramMessage