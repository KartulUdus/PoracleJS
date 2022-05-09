const path = require('path')
const fs = require('fs')

const maxLength = 2000
async function split(message, send) {
	let remainingMessage = message

	while (remainingMessage.length > maxLength) {
		let breakPosn = maxLength
		while (breakPosn && remainingMessage[breakPosn] !== '\n') breakPosn--

		if (!breakPosn) { // Can't find CR, just break wherever
			breakPosn = maxLength - 1
		}
		const toSend = remainingMessage.substring(0, breakPosn + 1)
		remainingMessage = remainingMessage.substring(breakPosn + 1)

		await send(toSend)
	}

	if (remainingMessage.length) {
		await send(remainingMessage)
	}
}

class PoracleDiscordMessage {
	constructor(client, msg) {
		this.client = client
		this.msg = msg

		//		this.user = ctx.update.message.from || ctx.update.message.chat
		//		this.userId = this.user.id

		this.discord = msg
		this.userId = msg.author.id
		this.command = msg.content.split(' ')[0].substring(1)
	}

	// eslint-disable-next-line class-methods-use-this
	convertSafe(message) {
		return message.replace(/[_*[`]/g, ((m) => `\\${m}`))
	}

	getPings() {
		return [this.msg.mentions.users.map((u) => `<@!${u.id}>`), this.msg.mentions.roles.map((r) => `<@&${r.id}>`)].join('')
	}

	getMentions() {
		const targets = []
		this.msg.mentions.users.forEach((user) => targets.push({ id: user.id, name: user.tag, type: 'user' }))
		this.msg.mentions.channels.forEach((channel) => targets.push({ id: channel.id, name: channel.name, type: 'channel' }))

		return targets
	}

	get isFromAdmin() {
		return (this.client.config.discord.admins.includes(this.msg.author.id))
	}

	// eslint-disable-next-line class-methods-use-this
	get isFromCommunityAdmin() {
		return false
	}

	get isDM() {
		return (this.msg.channel.type === 'DM')
	}

	async reply(message) {
		// Don't actually reply, but send to channel to avoid Discord reply text
		if (message.embed || message.embeds) {
			if (message.embed) {
				message.embeds = [message.embed]
				delete message.embed
			}

			this.msg.channel.send(message)
		} else {
			// This is a channel, do not reply but rather send to avoid @ reply
			await split(message, async (msg) => this.msg.channel.send(msg))
		}
	}

	async replyWithImageUrl(title, message, url) {
		const messageText = {
			embeds: [{
				color: 0x00ff00,
				title,
				description: message,
				image: {
					url,
				},
			}],
		}

		if (this.client.config.discord.uploadEmbedImages) {
			messageText.embeds[0].image.url = 'attachment://image.png'
			messageText.files = [{ attachment: url, name: 'image.png' }]
		}

		await this.msg.reply(messageText)
	}

	async replyWithAttachment(message, attachment) {
		if (this.msg.channel.type === 'GUILD_TEXT' || this.msg.channel.type === 'GUILD_NEWS') {
			// This is a channel, do not reply but rather send to avoid @ reply
			return this.msg.channel.send({ content: message, files: [attachment] })
		}

		return this.msg.reply({ content: message, files: [attachment] })
	}

	async replyAsAttachment(message, title, filename) {
		const filepath = path.join(__dirname, filename)
		fs.writeFileSync(filepath, message)
		await this.msg.reply({ content: title, files: [filepath] })
		fs.unlinkSync(filepath)
	}

	async react(message) {
		return this.msg.react(message)
	}

	async replyByDM(message) {
		return this.msg.author.send(message)
	}

	// eslint-disable-next-line class-methods-use-this
	get maxLength() {
		return maxLength
	}
}

module.exports = PoracleDiscordMessage
