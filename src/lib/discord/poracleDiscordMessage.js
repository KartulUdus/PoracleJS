class PoracleDiscordMessage {
	constructor(client, msg) {
		this.client = client
		this.msg = msg

		//		this.user = ctx.update.message.from || ctx.update.message.chat
		//		this.userId = this.user.id

		this.discord = msg
		this.userId = msg.author.id
	}

	get isFromAdmin() {
		return (this.client.config.discord.admins.includes(this.msg.author.id))
	}

	get isDM() {
		return !(this.msg.channel.type === 'text')
	}

	async reply(message) {
		return this.msg.reply(message)
	}

	async react(message) {
		return this.msg.react(message)
	}

	async replyByDM(message) {
		return this.msg.author.send(message)
	}
}

module.exports = PoracleDiscordMessage