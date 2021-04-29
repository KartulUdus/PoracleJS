const DiscordReconciliation = require('../../discordReconciliation')

module.exports = async (client, oldPresence) => {
	try {
		client.logs.discord.info(`Discord event: guildMemberUpdate - ${oldPresence.user.id}`)

		if (client.config.discord.admins.includes(oldPresence.user.id)) return
		if (oldPresence.user.bot) return

		const dr = new DiscordReconciliation(oldPresence.client,
			client.logs.log,
			client.config,
			client.query, client.dts)

		await dr.reconcileSingleUser(oldPresence.user.id,
			client.config.reconciliation.discord.removeInvalidUsers)
	} catch (e) {
		client.logs.discord.error('Role based registration errored', e)
	}
}
