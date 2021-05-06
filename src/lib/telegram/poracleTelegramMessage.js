const fs = require('fs')

class PoracleTelegramMessage {
	constructor(ctx) {
		this.ctx = ctx
		this.config = ctx.state.controller.config

		this.user = ctx.update.message.from || ctx.update.message.chat
		this.userId = this.user.id
		this.userName = this.user.username

		this.fullName = `${this.user.first_name} ${this.user.last_name ? this.user.last_name : ''} [${this.user.username ? this.user.username : ''}]`
		this.prefix = '/'
		this.command = ctx.state.command.command
	}

	// eslint-disable-next-line class-methods-use-this
	convertSafe(message) {
		return message.replace(/[_*[`]/g, ((m) => `\\${m}`))
	}

	// eslint-disable-next-line class-methods-use-this
	getPings() {
		return ''
	}

	// eslint-disable-next-line class-methods-use-this
	getMentions() {
		return []
	}

	get isFromAdmin() {
		return (this.config.telegram.admins.includes(this.userId.toString()))
	}

	get isDM() {
		return this.ctx.update.message.chat.type === 'private'
	}

	async reply(message, options = {}) {
		const maxLength = 4095
		if (!options.disableSplit) {
			let remainingMessage = options.style != 'markdown' ? this.convertSafe(message) : message

			while (remainingMessage.length > maxLength) {
				let breakPosn = maxLength
				while (breakPosn && remainingMessage[breakPosn] != '\n') breakPosn--

				if (!breakPosn) break // cannot find CR - abort
				const toSend = remainingMessage.substring(0, breakPosn + 1)
				remainingMessage = remainingMessage.substring(breakPosn + 1)

				await this.ctx.reply(toSend, {
					parse_mode: 'Markdown',
					disable_web_page_preview: true,
				})
			}

			if (remainingMessage.length) {
				return this.ctx.reply(remainingMessage, {
					parse_mode: 'Markdown',
					disable_web_page_preview: true,
				})
			}

			return
		}
		return this.ctx.reply(options.style != 'markdown' ? this.convertSafe(message) : message, {
			parse_mode: 'Markdown',
			disable_web_page_preview: true,
		})
	}

	async replyWithImageUrl(title, message, url) {
		return this.ctx.reply(`[\u200A](${url})*${title}*\n${message || ''}`,
			{
				parse_mode: 'Markdown',
				disable_web_page_preview: false,
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

	async react(message, options = {}) {
		return this.ctx.reply(options.style != 'markdown' ? this.convertSafe(message) : message)
	}

	async replyByDM(message, options = {}) {
		return this.ctx.telegram.sendMessage(this.userId, options.style != 'markdown' ? this.convertSafe(message) : message)
	}

	async send(target, message, options = {}) {
		return this.ctx.telegram.sendMessage(target, options.style != 'markdown' ? this.convertSafe(message) : message)
	}
}

module.exports = PoracleTelegramMessage