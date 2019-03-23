module.exports = (client, channel) => {

	client.query.countQuery('id', 'humans', 'id', channel.id).then((isregistered) => {
		if (isregistered) {
			client.query.deleteQuery('egg', 'id', channel.id)
			client.query.deleteQuery('monsters', 'id', channel.id)
			client.query.deleteQuery('raid', 'id', channel.id)
			client.query.deleteQuery('quest', 'id', channel.id)
			client.query.deleteQuery('humans', 'id', channel.id)
			client.log.log({ level: 'debug', message: `text channel ${channel.name} was deleted and unregistered`, event: 'discord:registerCheck' })
		}
	})
}