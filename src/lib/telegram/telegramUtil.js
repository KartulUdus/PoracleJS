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
			this.log.debug(`Checking role for: ${user.name} - ${user.id}`)
			try {
				const telegramUser = await this.telegraf.telegram.getChatMember(group, user.id)
				if (telegramUser) {
					const { status } = telegramUser
					if (['left', 'kicked'].includes(status)) {
						this.log.debug(`User ${user.name} - ${user.id} has status ${status}`)
						invalidUsers.push(user)
					}
				}
			} catch (err) {
				this.log.warn('Error retrieving telegram user data - may need manual intervention', err)
			}
		}
		return invalidUsers
	}
}

module.exports = TelegramUtil