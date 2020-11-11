module.exports = (client, member) => {
	if (!client.users.cache.keyArray().includes(member.id)) {
		client.query.countQuery('id', 'humans', 'id', member.id).then((isregistered) => {
			if (isregistered) {
				client.query.deleteQuery('egg', 'id', member.id)
				client.query.deleteQuery('monsters', 'id', member.id)
				client.query.deleteQuery('raid', 'id', member.id)
				client.query.deleteQuery('quest', 'id', member.id)
				client.query.deleteQuery('humans', 'id', member.id)
				client.log.log({ level: 'debug', message: `user ${member.tag} left the server and was auto-unregistered`, event: 'discord:registerCheck' })
			}
		})
	}
}