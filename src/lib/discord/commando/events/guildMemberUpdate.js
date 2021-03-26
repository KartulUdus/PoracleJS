const DiscordReconciliation = require('../../discordReconciliation')

module.exports = async (client, oldPresence) => {
	try {
		if (client.config.discord.admins.includes(oldPresence.user.id)) return

		const dr = new DiscordReconciliation(oldPresence.client,
			client.config,
			client.query, client.dts)

		await dr.reconcileSingleUser(oldPresence.user.id,
			client.logs.log,
			client.config.reconciliation.discord.removeInvalidUsers)
	} catch (e) {
		client.logs.discord.error('Role based registration errored', e)
	}
}
