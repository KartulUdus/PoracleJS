class PoracleDiscordUtil {
	constructor(client, msg, options) {
		this.client = client
		this.msg = msg
		this.options = options

		this.prefix = this.client.config.discord.prefix
	}

	async calculatePermissions() {
		let channelPermissions = false

		if (!this.msg.isDM) {
			const postUserId = this.msg.msg.author.id
			const postChannelId = this.msg.msg.channel.id
			const postGuildId = this.msg.msg.channel.guild ? this.msg.msg.channel.guild.id : 'x'
			const postChannelCategoryId = this.msg.msg.channel.parentID

			this.client.log.debug(`Channel message - examine permissions for ${postUserId} in channel ${postChannelId} guild ${postGuildId} category ${postChannelCategoryId}`)
			try {
				const guildMember = await this.msg.msg.channel.guild.members.fetch(postUserId)

				if (guildMember) {
					const userRoleMembership = []

					for (const role of guildMember.roles.cache.values()) {
						userRoleMembership.push(role.id)
					}

					const roleList = this.client.config.discord.delegatedAdministration
						? this.client.config.discord.delegatedAdministration.channelTracking : null

					if (roleList) {
						for (const id of Object.keys(roleList)) {
							if (id == postChannelId || id == postGuildId || id == postChannelCategoryId) {
								const checkUserAgainst = roleList[id]

								if (checkUserAgainst.includes(postUserId)) {
									channelPermissions = true
								}

								for (const role of userRoleMembership) {
									if (checkUserAgainst.includes(role)) {
										channelPermissions = true
									}
								}
							}
						}
					}
				}
			} catch (err) {
				this.client.log.error('Calculating user security', err)
			}
		}

		this.permissions = {
			channelTracking: channelPermissions,
		}
	}

	canAdminWebhook(name) {
		const postUserId = this.msg.msg.author.id

		const webHookAdminIds = this.client.config.discord.delegatedAdministration
			&& this.client.config.discord.delegatedAdministration.webhookTracking
			? this.client.config.discord.delegatedAdministration.webhookTracking[name] : null
		if (!webHookAdminIds) return false
		return webHookAdminIds.includes(postUserId)
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

		const human = target.webhook
			? await this.client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
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
		await this.calculatePermissions()

		if (!this.msg.isDM && !this.msg.isFromAdmin && !this.permissions.channelTracking && !this.permissions.channelCreation) {
			await this.msg.replyByDM(this.client.translator.translate('Please run commands in Direct Messages'))

			return { canContinue: false }
		}

		let target = {
			id: this.msg.msg.author.id, type: 'discord:user', name: this.msg.msg.author.tag, webhook: false,
		}

		let status

		if (this.options && this.options.targetOverride) {
			target.id = this.options.targetOverride.id
			target.name = this.options.targetOverride.name
			target.type = this.options.targetOverride.type
			target.webook = (target.type == 'webhook')
			status = await this.checkRegistrationStatus(target)
		} else {
			let webhookName = args.find((arg) => arg.match(this.client.re.nameRe))
			if (webhookName) [, , webhookName] = webhookName.match(this.client.re.nameRe)

			let userIdOverride = args.find((arg) => arg.match(this.client.re.userRe))
			if (userIdOverride) [, , userIdOverride] = userIdOverride.match(this.client.re.userRe)

			if (this.msg.msg.channel.type === 'text' && (this.msg.isFromAdmin || this.permissions.channelTracking)) {
				target = {
					id: this.msg.msg.channel.id,
					name: this.msg.msg.channel.name,
					type: 'discord:channel',
					webhook: false,
				}
			}

			if (this.msg.isFromAdmin && userIdOverride) {
				target.id = userIdOverride
			}

			if (webhookName && (this.msg.isFromAdmin || this.canAdminWebhook(webhookName))) {
				target = {
					name: webhookName,
					type: 'webhook',
					webhook: true,
				}
			}

			status = await this.checkRegistrationStatus(target)

			if (!status.isRegistered && this.msg.isFromAdmin && target.webhook) {
				await this.msg.reply(`Webhook ${target.name} ${this.client.translator.translate('does not seem to be registered. add it with')} ${this.client.config.discord.prefix}${this.client.translator.translate('channel')} ${this.client.translator.translate('add')} ${this.client.translator.translate('name')}webhookname ${this.client.translator.translate('<Your-Webhook-url>')}`)
				return { canContinue: false }
			}

			if (!status.isRegistered && (this.msg.isFromAdmin || this.permissions.channelTracking) && this.msg.msg.channel.type === 'text') {
				await this.msg.reply(`${this.msg.msg.channel.name} ${this.client.translator.translate('does not seem to be registered. add it with')} ${this.client.config.discord.prefix}${this.client.translator.translate('channel')} ${this.client.translator.translate('add')}`)
				return { canContinue: false }
			}

			if (!status.isRegistered && this.msg.isFromAdmin && userIdOverride) {
				await this.msg.reply(this.client.translator.translate('User with that identity does not appear to be registered (or is disabled)'))
				return { canContinue: false }
			}

			if (!status.isRegistered && this.msg.msg.channel.type === 'dm') {
				await this.msg.react(this.client.translator.translate('🙅'))
				if (this.client.config.discord.unregisteredUserMessage) {
					await this.msg.reply(this.client.config.discord.unregisteredUserMessage)
				}
				return { canContinue: false }
			}

			if (this.msg.isFromAdmin && userIdOverride) {
				target.name = status.name
				target.type = status.type
				await this.msg.reply(`${this.client.translator.translate('This command is being executed as')} ${target.id} ${target.name}`)
			}

			if (target.webhook) target.id = status.id
		}

		return {
			canContinue: true,
			target,
			isRegistered: status.isRegistered,
			userHasLocation: status.userHasLocation,
			userHasArea: status.userHasArea,
			language: status.language,
			currentProfileNo: status.currentProfileNo,
			targetIsAdmin: this.client.config.discord.admins.includes(target.id.toString()),
		}
	}
}

module.exports = PoracleDiscordUtil