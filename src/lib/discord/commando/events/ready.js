module.exports = (client) => {
	client.logs.discord.info(`Commando "${client.user.tag}" awaiting for orders!`)
	if (client.config.discord.activity) {
		client.user.setActivity(client.config.discord.activity)
	}
}