module.exports = async (client, oldPresence, newPresence) => {
	try {
		let before = false
		let after = false
		const roleBefore = oldPresence.roles.cache.find((role) => client.config.discord.userRole.includes(role.id))
		const roleAfter = newPresence.roles.cache.find((role) => client.config.discord.userRole.includes(role.id))
		if (roleBefore) before = true
		if (roleAfter) after = true

		if (!before && after) {
			const isRegistered = await client.query.countQuery('humans', { id: oldPresence.user.id })
			if (!isRegistered) {
				await client.query.insertOrUpdateQuery('humans', [{
					id: oldPresence.user.id, type: 'discord:user', name: client.emojiStrip(oldPresence.user.username), area: '[]',
				}])
				if (!client.config.discord.disableAutoGreetings) {
					const greetingDts = client.dts.find((template) => template.type === 'greeting' && template.platform === 'discord' && template.default)
					const view = { prefix: client.config.discord.prefix }
					const greeting = client.mustache.compile(JSON.stringify(greetingDts.template))
					await oldPresence.user.send(JSON.parse(greeting(view)))
				}

				client.logs.discord.log({ level: 'info', message: `registered ${oldPresence.user.username} because ${roleAfter.name} added`, event: 'discord:roleCheck' })
			}
		}
		if (before && !after) {
			const isRegistered = await client.query.countQuery('humans', { id: oldPresence.user.id })
			if (isRegistered) {
				await client.query.deleteQuery('egg', { id: oldPresence.user.id })
				await client.query.deleteQuery('monsters', { id: oldPresence.user.id })
				await client.query.deleteQuery('raid', { id: oldPresence.user.id })
				await client.query.deleteQuery('quest', { id: oldPresence.user.id })
				await client.query.deleteQuery('humans', { id: oldPresence.user.id })
				client.logs.discord.log({ level: 'info', message: `unregistered ${oldPresence.user.username} because ${roleBefore.name} role removed`, event: 'discord:roleCheck' })
			}
		}
	} catch (e) {
		client.logs.discord.error('Role based registration errored', e)
	}
}
