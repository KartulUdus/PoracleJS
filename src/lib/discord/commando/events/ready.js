module.exports = (client) => {
	client.logs.discord.info(`Commando "${client.user.tag}" awaiting your orders!`)
	client.user.setActivity(client.config.discord.activity)
}
