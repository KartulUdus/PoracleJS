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
			} else if (isRegistered && client.config.general.roleCheckDeletionsMode == 2) {
			    const user = await client.query.selectOneQuery('humans', { id: oldPresence.user.id })
			    if (user.admin_disable && !user.disabled_date) {
			        await client.query.updateQuery('humans', { admin_disable: 0 }, { id: oldPresence.user.id })
				    client.logs.discord.log({ level: 'info', message: `enabled ${oldPresence.user.username} because ${roleAfter.name} added`, event: 'discord:roleCheck' })
			    }
			}
		}
		if (before && !after) {
			const isRegistered = await client.query.countQuery('humans', { id: oldPresence.user.id })
			if (isRegistered) {
			    if (client.config.general.roleCheckDeletionsMode == 2) {
			        const user = await client.query.selectOneQuery('humans', { id: oldPresence.user.id })
			        if (!user.admin_disable) {
                        await client.query.updateQuery('humans', { admin_disable: 1 }, { id: oldPresence.user.id })
                        client.logs.discord.log({ level: 'info', message: `disabled ${oldPresence.user.username} because ${roleBefore.name} role removed`, event: 'discord:roleCheck' })
                    }
			    } else if (client.config.general.roleCheckDeletionsMode == 1) {
                    await client.query.deleteQuery('egg', { id: oldPresence.user.id })
                    await client.query.deleteQuery('monsters', { id: oldPresence.user.id })
                    await client.query.deleteQuery('raid', { id: oldPresence.user.id })
                    await client.query.deleteQuery('quest', { id: oldPresence.user.id })
                    await client.query.deleteQuery('humans', { id: oldPresence.user.id })
                    client.logs.discord.log({ level: 'info', message: `unregistered ${oldPresence.user.username} because ${roleBefore.name} role removed`, event: 'discord:roleCheck' })
			    } else {
                    client.logs.discord.log({ level: 'info', message: `${oldPresence.user.username} lost ${roleBefore.name} role but wasnt unregistered/disabled due to configuration`, event: 'discord:roleCheck' })
                }
			}
		}
	} catch (e) {
		client.logs.discord.error('Role based registration errored', e)
	}
}
