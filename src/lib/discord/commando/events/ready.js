module.exports = (client) => {
	client.log.info(`Commando "${client.user.tag}" awaiting for orders!`)
	client.user.setPresence({
		game: {
			name: 'PoracleJS',
		},
	})
}