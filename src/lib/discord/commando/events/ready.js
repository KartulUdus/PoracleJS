module.exports = (client) => {
	client.logs.discord.info(`Commando "${client.user.tag}" awaiting for orders!`)
	client.user.setActivity('PoracleJS')
}