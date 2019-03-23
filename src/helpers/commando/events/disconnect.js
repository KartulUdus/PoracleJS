module.exports = (client) => {

	client.log.error(`commando "${client.user.tag}" disconnected. commiting seppuku`)
	process.exit()

}