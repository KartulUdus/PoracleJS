module.exports = async (client, member) => {
	try {
		const isRegistered = await client.query.countQuery('humans', { id: member.id })
		if (isRegistered) {
            if (client.config.general.roleCheckDeletionsMode == 2) {
                const user = await client.query.selectOneQuery('humans', { id: member.id })
                if (!user.admin_disable) {
                    await client.query.updateQuery('humans', { admin_disable: 1 }, { id: member.id })
                    client.logs.discord.log({ level: 'debug', message: `user ${member.tag} left the server and was auto-disabled`, event: 'discord:registerCheck' })
                }
            } else if (client.config.general.roleCheckDeletionsMode == 1) {
                await client.query.deleteQuery('egg', { id: member.id })
                await client.query.deleteQuery('monsters', { id: member.id })
                await client.query.deleteQuery('raid', { id: member.id })
                await client.query.deleteQuery('quest', { id: member.id })
                await client.query.deleteQuery('humans', { id: member.id })
                client.logs.discord.log({ level: 'debug', message: `user ${member.tag} left the server and was auto-unregistered`, event: 'discord:registerCheck' })
            } else {
                client.logs.discord.log({ level: 'debug', message: `user ${member.tag} left the server but wasnt auto unregistered/disabled due to configuration`, event: 'discord:registerCheck' })
            }
		}
	} catch (e) {
		client.logs.discord.error('Discord event: guildMemberRemove - was unable to remove/disable human', e)
	}
}
