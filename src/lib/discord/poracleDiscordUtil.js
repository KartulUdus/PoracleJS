class PoracleDiscordUtil {
	constructor(client, msg, command) {
		this.client = client
		this.msg = msg
		this.command = command

		this.prefix = this.client.config.discord.prefix
	}

	async checkRegistrationStatus(target) {
		let userHasLocation = false
		let userHasArea = false
		let isRegistered = false
		let id
		let language = null

		const human = target.webhook
			? await this.client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await this.client.query.selectOneQuery('humans', { id: target.id })

		if (human) {
			isRegistered = true
			id = human.id
			language = human.language || this.client.config.general.locale
			if (+human.latitude !== 0 && +human.longitude !== 0) userHasLocation = true
			if (human.area.length > 2) userHasArea = true
		}

		return {
			isRegistered, userHasLocation, userHasArea, language, id,
		}
	}

	async buildTarget(args) {
		if (!this.msg.isFromAdmin && !this.msg.isDM) {
			await this.msg.replyByDM(this.client.translator.translate('Please run commands in Direct Messages'))

			return { canContinue: false }
		}

		let target = {
			id: this.msg.msg.author.id, type: 'discord:user', name: this.msg.msg.author.tag, webhook: false,
		}

		let webhookName = args.find((arg) => arg.match(this.client.re.nameRe))
		if (webhookName) [,, webhookName] = webhookName.match(this.client.re.nameRe)
		if (this.msg.isFromAdmin && this.msg.msg.channel.type === 'text') {
			target = {
				id: this.msg.msg.channel.id,
				name: this.msg.msg.channel.name,
				type: 'discord:channel',
				webhook: false,
			}
		}
		if (this.msg.isFromAdmin && webhookName) {
			target = {
				name: webhookName.replace(this.client.translator.translate('name'), ''),
				type: 'webhook',
				webhook: true,
			}
		}

		const status = await this.checkRegistrationStatus(target)

		if (!status.isRegistered && this.msg.isFromAdmin && target.webhook) {
			await this.msg.reply(`Webhook ${target.name} ${this.client.translator.translate('does not seem to be registered. add it with')} ${this.client.config.discord.prefix}${this.client.translator.translate('channel')} ${this.client.translator.translate('add')} ${this.client.translator.translate('name')}webhookname ${this.client.translator.translate('<Your-Webhook-url>')}`)
			return { canContinue: false }
		}

		if (!status.isRegistered && this.msg.isFromAdmin && this.msg.msg.channel.type === 'text') {
			await this.msg.reply(`${this.msg.msg.channel.name} ${this.client.translator.translate('does not seem to be registered. add it with')} ${this.client.config.discord.prefix}${this.client.translator.translate('channel')} ${this.client.translator.translate('add')}`)
			return { canContinue: false }
		}

		if (!status.isRegistered && this.msg.msg.channel.type === 'dm') {
			await this.msg.react(this.client.translator.translate('🙅'))
			return { canContinue: false }
		}

		if (target.webhook) target.id = status.id

		return {
			canContinue: true,
			target,
			isRegistered: status.isRegistered,
			userHasLocation: status.userHasLocation,
			userHasArea: status.userHasArea,
			language: status.language,
		}
	}
}

module.exports = PoracleDiscordUtil