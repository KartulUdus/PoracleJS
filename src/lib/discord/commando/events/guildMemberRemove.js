module.exports = async (client, member) => {
	try {
		const isRegistered = await client.query.countQuery('humans', { id: member.id })
		if (isRegistered) {
			await client.query.deleteQuery('egg', { id: member.id })
			await client.query.deleteQuery('monsters', { id: member.id })
			await client.query.deleteQuery('raid', { id: member.id })
			await client.query.deleteQuery('quest', { id: member.id })
			await client.query.deleteQuery('humans', { id: member.id })
			client.log.log({ level: 'debug', message: `user ${member.tag} left the server and was auto-unregistered`, event: 'discord:registerCheck' })
		}
	} catch (e) {
		client.log.error(`Was unable to remove human : ${e}`)
	}
}
