const { DiscordAPIError } = require('discord.js')

class DiscordRoleSetter {
	constructor(client, config, log) {
		this.client = client
		this.log = log
		this.config = config
	}

	async list(id) {
		const allServersRoleList = []

		for (const [guildId, guildDetails] of Object.entries(this.config.discord.userRoleSubscription)) {
			const guild = await this.client.guilds.fetch(guildId)

			const thisServer = { name: guild.name }

			// Fetch the GuildMember from appropriate guild as this is likely a DM
			try {
				const guildMember = await guild.members.fetch(id)

				const serverRoles = {
					exclusive: [],
					general: [],
				}

				let exclusiveRoles = guildDetails.exclusiveRoles || []
				if (!Array.isArray(exclusiveRoles)) exclusiveRoles = [exclusiveRoles]

				for (const exclusiveRole of exclusiveRoles) {
					const thisExclusiveSet = []
					for (const [roleDesc, roleId] of Object.entries(exclusiveRole)) {
						const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

						thisExclusiveSet.push({
							description: roleDesc,
							id: roleId,
							set: !!discordRole,
						})
					}
					serverRoles.exclusive.push(thisExclusiveSet)
				}

				const roles = guildDetails.roles || {}
				for (const [roleDesc, roleId] of Object.entries(roles)) {
					const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

					serverRoles.general.push({
						description: roleDesc,
						id: roleId,
						set: !!discordRole,
					})
				}

				thisServer.roles = serverRoles
				allServersRoleList.push(thisServer)
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

		return allServersRoleList
	}

	async setRole(id, roleId, set) {
		const roleChanges = []
		for (const [guildId, guildDetails] of Object.entries(this.config.discord.userRoleSubscription)) {
			const guild = await this.client.guilds.fetch(guildId)

			let guildMember

			// Fetch the GuildMember from appropriate guild as this is likely a DM
			try {
				guildMember = await guild.members.fetch(id)
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

				const [matchRole] = Object.entries(roles).find(([, rid]) => rid === roleId) ?? []
				if (matchRole) {
					// const roleId = role // roles[matchRole]
					const role = guild.roles.cache.find((r) => r.id === roleId)

					if (set) {
						await guildMember.roles.add(role)
						roleChanges.push({
							description: matchRole,
							id: roleId,
							set: true,
						})
						// await msg.reply(translator.translateFormat('You have been granted the role {0}', matchRole))
					} else {
						await guildMember.roles.remove(role)
						roleChanges.push({
							description: matchRole,
							id: roleId,
							set: false,
						})
						// await msg.reply(translator.translateFormat('I have removed the role {0}', matchRole))
					}
				}

				let exclusiveRoles = guildDetails.exclusiveRoles || []
				if (!Array.isArray(exclusiveRoles)) exclusiveRoles = [exclusiveRoles]

				for (const exclusiveRole of exclusiveRoles) {
					const [matchExclusiveRole] = Object.entries(exclusiveRole).find(([, rid]) => rid === roleId) ?? []

					if (matchExclusiveRole) {
						if (set) {
							for (const [exclusiveRoleName, exclusiveRoleId] of Object.entries(exclusiveRole)) {
								if (exclusiveRoleId === roleId) {
									const role = guild.roles.cache.find((r) => r.id === exclusiveRoleId)
									await guildMember.roles.add(role)
									roleChanges.push({
										description: exclusiveRoleName,
										id: roleId,
										set: true,
									})
								} else {
									const discordRole = guildMember.roles.cache.find((r) => r.id === exclusiveRoleId)

									if (discordRole) {
										await guildMember.roles.remove(discordRole)
										roleChanges.push({
											description: exclusiveRoleName,
											id: exclusiveRoleId,
											set: false,
										})
									}
								}
							}
						} else {
							const role = guild.roles.cache.find((r) => r.id === roleId)
							await guildMember.roles.remove(role)

							roleChanges.push({
								description: matchExclusiveRole,
								id: roleId,
								set: false,
							})
						}
					}
				}
			}
		}

		return roleChanges
	}
}

module.exports = DiscordRoleSetter