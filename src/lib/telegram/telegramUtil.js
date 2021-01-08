class TelegramUtil {
	constructor(config, log, telegraf) {
		this.config = config
		this.log = log
		this.telegraf = telegraf
	}

	async checkMembership(users, group) {
		const allUsers = users
		const invalidUsers = []

		for (const user of allUsers) {
			this.log.info(`Checking role for: ${user.name} - ${user.id}`)
			const telegramUser = await this.telegraf.telegram.getChatMember(group, user.id)
			if (telegramUser) {
				const { status } = telegramUser
				if (['left', 'kicked'].includes(status)) {
					this.log.info(`User ${user.name} - ${user.id} has status ${status}`)
					invalidUsers.push(user)
				}
			}
		}
		return invalidUsers
	}
}

module.exports = TelegramUtil