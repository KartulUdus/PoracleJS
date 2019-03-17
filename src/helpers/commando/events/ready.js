module.exports = (client) => {

	client.log.info(`commando "${client.user.tag}" awaiting for orders!`)
	client.user.setPresence({
		game: {
			name: 'PoracleJS',
		},
	})

	client.query.selectAllQuery('humans', 'enabled', 1).then((humans) => {
		humans.forEach((human) => {
			if (!client.channels.keyArray().includes(human.id) && !client.users.keyArray().includes(human.id) && !human.id.match(client.hookRegex)) {
				client.log.log({ level: 'debug', message: `unregistered ${human.name} due to 404`, event: 'discord:registerCheck' })

				client.query.deleteQuery('egg', 'id', human.id)
				client.query.deleteQuery('monsters', 'id', human.id)
				client.query.deleteQuery('raid', 'id', human.id)
				client.query.deleteQuery('quest', 'id', human.id)
				client.query.deleteQuery('humans', 'id', human.id)
			}
		})
	})
}