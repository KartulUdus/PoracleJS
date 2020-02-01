module.exports = async (client, oldMember, newMember) => {
	let before = false
	let after = false
	const roleBefore = oldMember.roles.find((role) => client.config.discord.userRole.includes(role.id))
	const roleAfter = newMember.roles.find((role) => client.config.discord.userRole.includes(role.id))
	if (roleBefore) before = true
	if (roleAfter) after = true
	try {
		if (!before && after) {
			const isRegistered = await client.query.countQuery('humans', { id: oldMember.user.id })
			if (!isRegistered) {
				await client.query.insertOrUpdateQuery('humans', [{
					id: oldMember.user.id, type: 'discord:user', name: client.emojiStrip(oldMember.user.username), area: '[]',
				}])
				const greetingDts = client.dts.find((template) => template.type === 'greeting')
				const view = { prefix: client.config.discord.prefix }
				const greeting = client.mustache.compile(JSON.stringify(greetingDts.template))
				await oldMember.user.send(JSON.parse(greeting(view)))

				client.log.log({ level: 'info', message: `registered ${oldMember.user.username} because ${roleAfter.name} added`, event: 'discord:roleCheck' })
			}
		}
		if (before && !after) {
			const isRegistered = await client.query.countQuery('humans', { id: oldMember.user.id })
			if (isRegistered) {
				await client.query.deleteQuery('egg', { id: oldMember.user.id })
				await client.query.deleteQuery('monsters', { id: oldMember.user.id })
				await client.query.deleteQuery('raid', { id: oldMember.user.id })
				await client.query.deleteQuery('quest', { id: oldMember.user.id })
				await client.query.deleteQuery('humans', { id: oldMember.user.id })
				client.log.log({ level: 'info', message: `unregistered ${oldMember.user.username} because ${roleBefore.name} role removed`, event: 'discord:roleCheck' })
			}
		}
	} catch (e) {
		client.log.error(`Role based registration errored : ${e}`)
	}
}