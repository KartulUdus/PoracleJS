exports.run = async (client, msg, [args]) => {
	const target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		const isRegistered = await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered) {
			return await msg.react(client.translator.translate('🙅'))
		}

		if (args.length === 0) {
			return await msg.reply('No args')
		}

		if (args[0] !== 'add' && args[0] !== 'remove') {
			return await msg.reply('Need to add args')
		}

		for (let param = 1; param < args.length; param++) {
			const roleToAdd = args[param]
			let found = false
			for (const [guildId, guildDetails] of Object.entries(client.config.discord.userRoleSubscription)) {
				const { roles } = guildDetails
				if (roleToAdd in roles) {
					found = true

					const roleId = roles[roleToAdd]

					const guild = await msg.client.guilds.fetch(guildId)

					const role = guild.roles.cache.find((r) => r.id === roleId)

					// Fetch the GuildMember from appropriate guild as this is likely a DM
					const member = await guild.members.fetch(msg.author.id)

					if (args[0] === 'add') {
						await member.roles.add(role)
						await msg.reply(`Added role ${roleToAdd}`)
					} else {
						await member.roles.remove(role)
						await msg.reply(`Removed role ${roleToAdd}`)
					}
				}
			}
			if (!found) {
				await msg.reply(`Could not find role ${roleToAdd}`)
			}
		}
	} catch (err) {
		await msg.reply('Something went wrong with your request')
		client.logs.log.error(`Role command "${msg.content}" unhappy:`, err)
	}
}
