const { DiscordAPIError } = require('discord.js')
const PoracleDiscordMessage = require('../../poracleDiscordMessage')

exports.run = async (client, discordMsg, [args]) => {
	const target = { id: discordMsg.author.id, name: discordMsg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(discordMsg.author.id) && discordMsg.channel.type === 'text') {
			return await discordMsg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		const msg = new PoracleDiscordMessage(client, discordMsg)

		if (!client.config.discord.userRoleSubscription) {
			return await msg.react(client.translator.translate('🙅'))
		}

		const human = await client.query.selectOneQuery('humans', { id: target.id, admin_disable: 0 })

		if (!human) {
			return await msg.react(client.translator.translate('🙅'))
		}

		const translator = client.translatorFactory.Translator(human.language || client.config.general.locale)

		if (args.length === 0 || (args[0] !== 'add' && args[0] !== 'remove' && args[0] !== 'list' && args[0] !== 'membership')) {
			return await msg.reply(translator.translateFormat('Valid commands are `{0}role list`, `{0}role add <areaname>`, `{0}role remove <areaname>`', client.config.discord.prefix))
		}

		if (args[0] === 'list') {
			let roleList = `${translator.translate('Roles available')}:\n`

			for (const [guildId, guildDetails] of Object.entries(client.config.discord.userRoleSubscription)) {
				const guild = await discordMsg.client.guilds.fetch(guildId)
				// Fetch the GuildMember from appropriate guild as this is likely a DM
				try {
					const guildMember = await guild.members.fetch(msg.userId)

					roleList = roleList.concat(`**${guild.name}**\n`)

					let exclusiveRoles = guildDetails.exclusiveRoles || []
					if (!Array.isArray(exclusiveRoles)) exclusiveRoles = [exclusiveRoles]

					for (const exclusiveRole of exclusiveRoles) {
						for (const [roleDesc, roleId] of Object.entries(exclusiveRole)) {
							const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

							roleList = roleList.concat(`   ${roleDesc.replace(/ /g, '_')}  ${discordRole ? '☑️' : ''}\n`)
						}

						roleList = roleList.concat('\n')
					}

					const roles = guildDetails.role || {}
					for (const [roleDesc, roleId] of Object.entries(roles)) {
						const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

						roleList = roleList.concat(`   ${roleDesc.replace(/ /g, '_')}  ${discordRole ? '☑️' : ''}\n`)
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

		if (args[0] === 'membership') {
			let roleList = `${translator.translate('You have the following roles')}:\n`

			for (const [guildId, guildDetails] of Object.entries(client.config.discord.userRoleSubscription)) {
				const guild = await discordMsg.client.guilds.fetch(guildId)
				// Fetch the GuildMember from appropriate guild as this is likely a DM
				try {
					const guildMember = await guild.members.fetch(msg.userId)

					roleList = roleList.concat(`${guild.name}\n`)

					let exclusiveRoles = guildDetails.exclusiveRoles || []
					if (!Array.isArray(exclusiveRoles)) exclusiveRoles = [exclusiveRoles]

					for (const exclusiveRole of exclusiveRoles) {
						for (const [roleDesc, roleId] of Object.entries(exclusiveRole)) {
							const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

							if (discordRole) {
								roleList = roleList.concat(`   ${roleDesc.replace(/ /g, '_')}\n`)
							}
						}
					}

					const roles = guildDetails.roles || {}
					for (const [roleDesc, roleId] of Object.entries(roles)) {
						const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

						if (discordRole) {
							roleList = roleList.concat(`   ${roleDesc.replace(/ /g, '_')}\n`)
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
				const guild = await discordMsg.client.guilds.fetch(guildId)

				let guildMember

				// Fetch the GuildMember from appropriate guild as this is likely a DM
				try {
					guildMember = await guild.members.fetch(msg.userId)
				} catch (err) {
					if (err instanceof DiscordAPIError) {
						if (err.httpStatus === 404) {
							// eslint-disable-next-line no-continue
							continue
						}
					} else {
						throw err
					}
				}

				if (guildMember) {
					const roles = guildDetails.roles || {}

					const matchRole = Object.keys(roles).find((r) => r.replace(/_/g, ' ').toLowerCase() === roleToAdd)
					if (matchRole) {
						found = true

						const roleId = roles[matchRole]
						const role = guild.roles.cache.find((r) => r.id === roleId)

						if (args[0] === 'add') {
							await guildMember.roles.add(role)
							await msg.reply(translator.translateFormat('You have been granted the role {0}', matchRole))
						} else {
							await guildMember.roles.remove(role)
							await msg.reply(translator.translateFormat('I have removed the role {0}', matchRole))
						}
					}

					let exclusiveRoles = guildDetails.exclusiveRoles || []
					if (!Array.isArray(exclusiveRoles)) exclusiveRoles = [exclusiveRoles]

					for (const exclusiveRole of exclusiveRoles) {
						const matchExclusiveRole = Object.keys(exclusiveRole)
							.find((r) => r.replace(/_/g, ' ')
								.toLowerCase() === roleToAdd)

						if (matchExclusiveRole) {
							found = true

							const roleId = exclusiveRole[matchExclusiveRole]

							if (args[0] === 'add') {
								for (const [exclusiveRoleName, exclusiveRoleId] of Object.entries(exclusiveRole)) {
									if (exclusiveRoleId === roleId) {
										const role = guild.roles.cache.find((r) => r.id === exclusiveRoleId)
										await guildMember.roles.add(role)
										await msg.reply(translator.translateFormat('You have been granted the role {0}', exclusiveRoleName))
									} else {
										const discordRole = guildMember.roles.cache.find((r) => r.id === exclusiveRoleId)

										if (discordRole) {
											await guildMember.roles.remove(discordRole)
											await msg.reply(translator.translateFormat('I have removed the role {0}', exclusiveRoleName))
										}
									}
								}
							} else {
								const role = guild.roles.cache.find((r) => r.id === roleId)
								await guildMember.roles.remove(role)

								await msg.reply(translator.translateFormat('I have removed the role {0}', matchExclusiveRole))
							}
						}
					}
				}
			}

			if (!found) {
				await msg.reply(translator.translateFormat('Unknown role -- {0}', roleToAdd))
			}
		}
	} catch (err) {
		await discordMsg.reply('Something went wrong with your request')
		client.logs.log.error(`Role command "${discordMsg.content}" unhappy:`, err)
	}
}
