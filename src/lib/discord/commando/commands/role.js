const { DiscordAPIError } = require('discord.js')

exports.run = async (client, msg, [args]) => {
	const target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		if (!client.config.discord.userRoleSubscription) {
			return await msg.react(client.translator.translate('🙅'))
		}

		const human = await client.query.selectOneQuery('humans', { id: target.id })

		if (!human) {
			return await msg.react(client.translator.translate('🙅'))
		}

		const translator = client.translatorFactory.Translator(human.language || this.client.config.general.locale)

		if (args.length === 0 || (args[0] !== 'add' && args[0] !== 'remove' && args[0] !== 'list')) {
			return await msg.reply(translator.translateFormat('Valid commands are `{0}role list`, `{0}role add <areaname>`, `{0}role remove <areaname>`', client.config.discord.prefix))
		}

		if (args[0] === 'list') {
			let roleList = ''

			for (const [guildId, guildDetails] of Object.entries(client.config.discord.userRoleSubscription)) {
				const guild = await msg.client.guilds.fetch(guildId)
				// Fetch the GuildMember from appropriate guild as this is likely a DM
				try {
					const guildMember = await guild.members.fetch(msg.author.id)

					roleList = roleList.concat(`${guild.name}\n`)

					const { roles } = guildDetails
					const discordRoles = [...guildMember.roles.cache.values()]
					for (const [roleDesc, roleId] of Object.entries(roles)) {
						if (discordRoles.some((x) => x.id === roleId)) {
							roleList = roleList.concat(`   ${roleDesc}\n`)
						}
					}
				} catch (err) {
					if (err instanceof DiscordAPIError) {
						if (err.httpStatus === 404) {
							// eslint-disable-next-line no-continue
							// last line in loop, so we don't need this
							// continue
						}
					} else {
						throw err
					}
				}
			}

			return msg.reply(roleList)
		}

		for (let param = 1; param < args.length; param++) {
			const roleToAdd = args[param]
			let found = false
			for (const [guildId, guildDetails] of Object.entries(client.config.discord.userRoleSubscription)) {
				const { roles } = guildDetails
				const matchRole = Object.keys(roles).find((r) => r.toLowerCase() === roleToAdd)
				if (matchRole) {
					found = true

					const roleId = roles[matchRole]

					const guild = await msg.client.guilds.fetch(guildId)

					const role = guild.roles.cache.find((r) => r.id === roleId)

					// Fetch the GuildMember from appropriate guild as this is likely a DM
					try {
						const member = await guild.members.fetch(msg.author.id)

						if (args[0] === 'add') {
							await member.roles.add(role)
							await msg.reply(translator.translateFormat('You have been granted the role {0}', matchRole))
						} else {
							await member.roles.remove(role)
							await msg.reply(translator.translateFormat('I have removed the role {0}', matchRole))
						}
					} catch (err) {
						if (err instanceof DiscordAPIError) {
							if (err.httpStatus === 404) {
								// eslint-disable-next-line no-continue
								await msg.reply(translator.translateFormat('You are not a member of the right guild to add {0}', matchRole))
							}
						} else {
							throw err
						}
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
