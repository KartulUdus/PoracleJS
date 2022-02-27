module.exports = (client) => {
	client.logs.discord.info(`Commando "${client.user.tag}" awaiting your orders!`)
	const guilds = []
	const guildId = []
	for (const guild of client.guilds.cache.values()) {
		guilds.push(`${guild.id}:${guild.name}`)
		guildId.push(guild.id)
	}
	client.logs.discord.info(`Bot is present in guilds ${guilds.join(', ')}`)
	const intersection = guildId.filter((element) => client.config.discord.guilds.includes(element))
	if (client.config.discord.guilds.length !== guildId.length || intersection.length !== guildId.length) {
		client.logs.discord.warn('config.discord.guilds does not contain all guilds bot is present in')
	}
}
