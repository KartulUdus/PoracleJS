const DiscordReconciliation = require('../../discordReconciliation')

module.exports = async (client, member) => {
	try {
		client.logs.discord.info(`Discord event: guildMemberRemove - ${member.id}`)

		if (client.config.discord.admins.includes(member.id)) return

		const dr = new DiscordReconciliation(member.client,
			client.logs.log,
			client.config,
			client.query, client.dts)

		await dr.reconcileSingleUser(member.id,
			client.config.reconciliation.discord.removeInvalidUsers)
	} catch (e) {
		client.logs.discord.error('Discord event: guildMemberRemove - was unable to remove/disable human', e)
	}
}
