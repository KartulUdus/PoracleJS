const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const DiscordRoleSetter = require('../../discordRoleSetter')

exports.run = async (client, discordMsg, [args]) => {
	const target = { id: discordMsg.author.id, name: discordMsg.author.tag, webhook: false }

	try {
		const msg = new PoracleDiscordMessage(client, discordMsg)

		// Check target
		if (!msg.isFromAdmin && !msg.isDM) {
			return await msg.replyByDM(client.translator.translate('Please run commands in Direct Messages'))
		}

		if (!client.config.discord.userRoleSubscription) {
			return await msg.react(client.translator.translate('🙅'))
		}

		if (msg.isFromAdmin) {
			let userIdOverride = args.find((arg) => arg.match(client.re.userRe))
			if (userIdOverride) {
				[, , userIdOverride] = userIdOverride.match(client.re.userRe)
				target.id = userIdOverride
			}
		}

		const human = await client.query.selectOneQuery('humans', { id: target.id, admin_disable: 0 })

		if (!human) {
			return await msg.react(client.translator.translate('🙅'))
		}

		const translator = client.translatorFactory.Translator(human.language || client.config.general.locale)

		if (args.length === 0 || (args[0] !== 'add' && args[0] !== 'remove' && args[0] !== 'list' && args[0] !== 'membership')) {
			return await msg.reply(translator.translateFormat('Valid commands are `{0}role list`, `{0}role add <areaname>`, `{0}role remove <areaname>`', client.config.discord.prefix))
		}

		const roleSetter = new DiscordRoleSetter(discordMsg.client, client.config, client.logs.log)

		if (args[0] === 'list') {
			let roleList = `${translator.translate('Roles available')}:\n`

			const allRoles = await roleSetter.list(target.id)

			for (const guild of allRoles) {
				roleList = roleList.concat(`**${guild.name}**\n`)

				for (const exclusiveRoleSet of guild.roles.exclusive) {
					for (const exclusiveRole of exclusiveRoleSet) {
						roleList = roleList.concat(`   ${exclusiveRole.description.replace(/ /g, '_')}  ${exclusiveRole.set ? '☑️' : ''}\n`)
					}
					roleList = roleList.concat('\n')
				}

				for (const role of guild.roles.general) {
					roleList = roleList.concat(`   ${role.description.replace(/ /g, '_')}  ${role.set ? '☑️' : ''}\n`)
				}

				if (guild.roles.general.length) {
					roleList = roleList.concat('\n')
				}
			}

			if (roleList.length > 2000) {
				return await msg.replyAsAttachment(roleList, 'Role List', 'rolelist.txt')
			}

			return await msg.reply(roleList)
		}

		if (args[0] === 'membership') {
			let roleList = `${translator.translate('You have the following roles')}:\n`

			const allRoles = await roleSetter.list(target.id)

			for (const guild of allRoles) {
				roleList = roleList.concat(`**${guild.name}**\n`)

				for (const exclusiveRoleSet of guild.roles.exclusive) {
					for (const exclusiveRole of exclusiveRoleSet) {
						if (exclusiveRole.set) {
							roleList = roleList.concat(`   ${exclusiveRole.description.replace(/ /g, '_')}\n`)
						}
					}
				}

				for (const role of guild.roles.general) {
					if (role.set) {
						roleList = roleList.concat(`   ${role.description.replace(/ /g, '_')}\n`)
					}
				}
			}

			if (roleList.length > 2000) {
				return await msg.replyAsAttachment(roleList, 'Role List', 'rolelist.txt')
			}

			return await msg.reply(roleList)
		}

		const set = args[0] === 'add'

		for (let param = 1; param < args.length; param++) {
			// eslint-disable-next-line no-continue
			if (args[param].match(client.re.userRe)) continue	// skip

			const results = []

			const roleToAdd = args[param]

			let found = false
			for (const [, guildDetails] of Object.entries(client.config.discord.userRoleSubscription)) {
				const roles = guildDetails.roles || {}

				const matchRole = Object.keys(roles).find((r) => r.replace(/_/g, ' ').toLowerCase() === roleToAdd)
				if (matchRole) {
					found = true

					const roleId = roles[matchRole]
					results.push(...await roleSetter.setRole(target.id, roleId, set))
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
						results.push(...await roleSetter.setRole(target.id, roleId, set))
					}
				}
			}

			if (!found) {
				await msg.reply(translator.translateFormat('Unknown role -- {0}', roleToAdd))
			}

			for (const result of results) {
				if (result.set) {
					await msg.reply(translator.translateFormat('You have been granted the role {0}', result.description))
				} else {
					await msg.reply(translator.translateFormat('I have removed the role {0}', result.description))
				}
			}
		}
	} catch (err) {
		await discordMsg.reply('Something went wrong with your request')
		client.logs.log.error(`Role command "${discordMsg.content}" unhappy:`, err)
	}
}
