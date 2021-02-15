class PoracleTelegramUtil {
	constructor(client, msg, command) {
		this.client = client
		this.msg = msg
		this.command = command

		this.prefix = '/'
	}

	async checkRegistrationStatus(target) {
		let userHasLocation = false
		let userHasArea = false
		let isRegistered = false
		let id
		let language = null
		let currentProfileNo = 1
		let name
		let type

		const human = target.channel
			? await this.client.query.selectOneQuery('humans', { name: target.name, type: 'telegram:channel' })
			: await this.client.query.selectOneQuery('humans', { id: target.id })

		if (human) {
			isRegistered = !human.admin_disable
			id = human.id
			language = human.language || this.client.config.general.locale
			name = human.name
			type = human.type
			currentProfileNo = human.current_profile_no
			if (+human.latitude !== 0 && +human.longitude !== 0) userHasLocation = true
			if (human.area.length > 2) userHasArea = true
		}

		return {
			isRegistered, userHasLocation, userHasArea, language, id, currentProfileNo, name, type,
		}
	}

	async buildTarget(args) {
		if (!this.msg.isFromAdmin && !this.msg.isDM) {
			await this.msg.replyByDM(this.client.translator.translate('Please run commands in Direct Messages'))

			return { canContinue: false }
		}

		let target = {
			id: this.msg.userId,
			name: this.msg.fullName,
			type: 'telegram:user',
			channel: false,
		}

		let channelName = args.find((arg) => arg.match(this.client.re.nameRe))
		if (channelName) [,, channelName] = channelName.match(this.client.re.nameRe)

		let userIdOverride = args.find((arg) => arg.match(this.client.re.userRe))
		if (userIdOverride) [,, userIdOverride] = userIdOverride.match(this.client.re.userRe)

		if (this.msg.isFromAdmin && !this.msg.isDM) {
			target = {
				id: this.msg.ctx.update.message.chat.id.toString(),
				type: 'telegram:group',
				name: this.msg.ctx.update.message.chat ? this.msg.ctx.update.message.chat.title.toLowerCase() : '',
				channel: false,
			}
		}

		if (this.msg.isFromAdmin && userIdOverride) {
			target.id = userIdOverride
		}

		if (this.msg.isFromAdmin && channelName) target = { name: channelName, type: 'telegram:channel', channel: true }

		const status = await this.checkRegistrationStatus(target)

		if (!status.isRegistered && this.msg.isFromAdmin && target.webhook) {
			await this.msg.reply(`Channel ${target.name} ${this.client.translator.translate('does not seem to be registered. add it with')} ${this.msg.prefix}${this.client.translator.translate('channel')} ${this.client.translator.translate('add')} ${this.client.translator.translate('name')}name ${this.client.translator.translate('<Your-Channel-id>')}`)
			return { canContinue: false }
		}

		if (!status.isRegistered && this.msg.isFromAdmin && !this.msg.isDM) {
			await this.msg.reply(`${this.msg.ctx.update.message.chat.title} ${this.client.translator.translate('does not seem to be registered. add it with')} ${this.msg.prefix}${this.client.translator.translate('channel')} ${this.client.translator.translate('add')}`)
			return { canContinue: false }
		}

		if (!status.isRegistered && this.msg.isFromAdmin && userIdOverride) {
			await this.msg.reply(this.client.translator.translate('User with that identity does not appear to be registered (or is disabled)'))
			return { canContinue: false }
		}

		if (!status.isRegistered && this.msg.isDM) {
			await this.msg.react(this.client.translator.translate('🙅'))
			return { canContinue: false }
		}

		if (this.msg.isFromAdmin && userIdOverride) {
			target.name = status.name
			target.type = status.type
			await this.msg.reply(`${this.client.translator.translate('This command is being executed as')} ${target.id} ${target.name}`)
		}

		if (target.channel) target.id = status.id

		return {
			canContinue: true,
			target,
			isRegistered: status.isRegistered,
			userHasLocation: status.userHasLocation,
			userHasArea: status.userHasArea,
			language: status.language,
			currentProfileNo: status.currentProfileNo,
		}
	}
}

module.exports = PoracleTelegramUtil