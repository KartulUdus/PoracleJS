module.exports = (client) => {
	client.logs.discord.info(`Commando "${client.user.tag}" awaiting your orders!`)
	if (client.config.discord.activity) {
		const activity = client.config.discord.activity == 'PoracleJS' ? 'PoracleJS' : `${client.config.discord.activity} (Poracle)`

		client.user.setActivity(activity)
	}
}