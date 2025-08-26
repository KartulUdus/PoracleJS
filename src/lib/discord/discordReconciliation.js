const { DiscordAPIError } = require('discord.js')
const mustache = require('handlebars')
const communityLogic = require('../communityLogic')
const emojiStrip = require('../../util/emojiStrip')

const haveSameContents = (a, b) => {
	for (const v of new Set([...a, ...b])) {
		if (a.filter((e) => e === v).length !== b.filter((e) => e === v).length) return false
	}
	return true
}

class DiscordReconciliation {
	constructor(client, log, config, query, dts) {
		this.client = client
		this.log = log
		this.config = config
		this.query = query
		this.client = client
		this.dts = dts
		this.mustache = mustache
	}

	async sendGreetings(id) {
		if (!this.config.discord.disableAutoGreetings) {
			const currentMinute = Math.floor(Date.now() / (1000 * 60))

			if (this.lastGreetingMessageMinute === currentMinute) {
				this.greetingCount++
				if (this.greetingCount > 10) {
					this.log.warn(`Reconciliation (Discord) Did not send greeting to ${id} - attempting to avoid ban ${this.greetingCount} messages in this minute`)
					return
				}
			} else {
				this.greetingCount = 0
				this.lastGreetingMessageMinute = currentMinute
			}

			const discordUser = await this.client.users.fetch(id)

			const greetingDts = this.dts.find((template) => template.type === 'greeting' && template.platform === 'discord' && template.default)
			const view = { prefix: this.config.discord.prefix }
			const greeting = this.mustache.compile(JSON.stringify(greetingDts.template)) /* grrr */
			await discordUser.createDM()
			const discordMsgToSend = JSON.parse(greeting(view))
			if (discordMsgToSend.embed) {
				discordMsgToSend.embeds = [discordMsgToSend.embed]
				delete discordMsgToSend.embed
			}
			try {
				await discordUser.send(discordMsgToSend)
			} catch (err) {
				this.log.error(`Reconciliation (Discord) Cannot send welcome message to "${id}"`, err)
			}
		}
	}

	async sendGoodbye(id) {
		if (this.config.discord.lostRoleMessage) {
			const discordUser = await this.client.users.fetch(id)
			await discordUser.createDM()

			await discordUser.send({ content: this.config.discord.lostRoleMessage })
		}
	}

	async removeRoles(user) {
		if (this.config.discord.userRoleSubscription) {
			const userId = user.id

			for (const [guildId, guildDetails] of Object.entries(this.config.discord.userRoleSubscription)) {
				const guild = await this.client.guilds.fetch(guildId)
				// Fetch the GuildMember from appropriate guild as this is likely a DM
				try {
					const guildMember = await guild.members.fetch(userId)

					const roles = guildDetails.roles || {}
					for (const roleId of Object.values(roles)) {
						const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

						if (discordRole) {
							this.log.info(`Reconciliation (Discord) Disable user ${user.id} removed role ${discordRole.name}`)

							await guildMember.roles.remove(discordRole)
						}
					}

					let exclusiveRoles = guildDetails.exclusiveRoles || []
					if (!Array.isArray(exclusiveRoles)) exclusiveRoles = [exclusiveRoles]

					for (const exclusiveRole of exclusiveRoles) {
						for (const roleId of Object.values(exclusiveRole)) {
							const discordRole = guildMember.roles.cache.find((r) => r.id === roleId)

							if (discordRole) {
								this.log.info(`Reconciliation (Discord) Disable user ${user.id} removed role ${discordRole.name}`)

								await guildMember.roles.remove(discordRole)
							}
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
		}
	}

	async disableUser(user) {
		if (this.config.general.roleCheckMode === 'disable-user') {
			if (!user.admin_disable) {
				await this.query.updateQuery('humans', {
					admin_disable: 1,
					disabled_date: this.query.dbNow(),
				}, { id: user.id })
				this.log.info(`Reconciliation (Discord) Disable user ${user.id} ${user.name}`)
				await this.removeRoles(user)
				await this.sendGoodbye(user.id)
			}
		} else if (this.config.general.roleCheckMode === 'delete') {
			await this.query.deleteQuery('egg', { id: user.id })
			await this.query.deleteQuery('monsters', { id: user.id })
			await this.query.deleteQuery('raid', { id: user.id })
			await this.query.deleteQuery('quest', { id: user.id })
			await this.query.deleteQuery('lures', { id: user.id })
			await this.query.deleteQuery('gym', { id: user.id })
			await this.query.deleteQuery('invasion', { id: user.id })
			await this.query.deleteQuery('nests', { id: user.id })
			await this.query.deleteQuery('forts', { id: user.id })
			await this.query.deleteQuery('weather', { id: user.id })
			await this.query.deleteQuery('profiles', { id: user.id })
			await this.query.deleteQuery('humans', { id: user.id })
			this.log.info(`Reconciliation (Discord) Delete user ${user.id} ${user.name}`)
			await this.removeRoles(user)
			await this.sendGoodbye(user.id)
		} else {
			this.log.info(`Reconciliation (Discord) Not removing invalid user ${user.id} [roleCheckMode is ignored]`)
		}
	}

	async reconcileSingleUser(id, removeInvalidUsers) {
		this.log.verbose(`Reconciliation (Discord) Check (single) user ${id}`)

		const roleList = []

		let name = ''
		// const notes = ''

		for (const guildId of this.config.discord.guilds) {
			let guild
			try {
				guild = await this.client.guilds.fetch(guildId)
			} catch (err) {
				this.log.warn(`Reconciliation (Discord) Cannot load guild "${guildId}"`, err)
				throw err
				// if (err instanceof DiscordAPIError) {
				// 	if (err.httpStatus === 403) {
				// 		// eslint-disable-next-line no-continue
				// 		continue
				// 		// this.logs.log.debug(`${guildID} no access`)
				//
				// 		// .push(...allUsers)
				// 		// return invalidUsers
				// 	}
				// } else {
				// 	throw err
				// }
			}
			if (!guild) {
				this.log.warn(`Reconciliation (Discord) Cannot load guild "${guildId}"`)
				// eslint-disable-next-line no-continue
				continue
			}

			let guildMember
			try {
				guildMember = await guild.members.fetch({ user: id, force: true })
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
				if (!name) name = emojiStrip(guildMember.displayName)
				for (const role of guildMember.roles.cache.values()) {
					roleList.push(role.id)
				}
			}
		}

		const user = await this.query.selectOneQuery('humans', { id })

		return this.reconcileUser(id, user, {
			name,
			roles: roleList,
		}, false, removeInvalidUsers)
	}

	async reconcileUser(id, user, discordUser, syncNames, removeInvalidUsers) {
		try {
			this.log.verbose(`Reconciliation (Discord) Check user ${id}`)

			const roleList = discordUser ? discordUser.roles : []
			const name = discordUser ? discordUser.name : ''

			let blocked = null
			if (this.config.discord.commandSecurity && Object.keys(this.config.discord.commandSecurity).length) {
				const blockedList = []
				for (const command of ['raid', 'monster', 'gym', 'specificgym', 'lure', 'nest', 'egg', 'invasion', 'pvp']) {
					const permissions = this.config.discord.commandSecurity[command]
					if (permissions && !permissions.includes(id) && !permissions.some((x) => roleList.includes(x))) {
						blockedList.push(command)
					}
				}
				if (blockedList.length) blocked = JSON.stringify(blockedList)
			}

			if (!this.config.areaSecurity.enabled) {
				if (this.config.discord.userRole?.length) {
					const before = !!user && !user.admin_disable
					const after = roleList.some((role) => this.config.discord.userRole.includes(role))

					if (!before && after) {
						if (!user) {
							this.log.info(`Reconciliation (Discord) Create user ${id} ${name}`)

							await this.query.insertOrUpdateQuery('humans', {
								id,
								type: 'discord:user',
								name,
								area: '[]',
								community_membership: '[]',
								blocked_alerts: blocked,
							})
							await this.sendGreetings(id)
						} else if (user.admin_disable && user.disabled_date) {
							this.log.info(`Reconciliation (Discord) Reactivate user ${id} ${name}`)

							await this.query.updateQuery('humans', {
								admin_disable: 0,
								disabled_date: null,
								blocked_alerts: blocked,
							}, { id })

							await this.sendGreetings(id)
						}
					}
					if (before && !after) {
						if (user && removeInvalidUsers) {
							await this.disableUser(user)
						}
					}
					if (before && after) {
						// check options for any changes here
						// should ignore admin?

						const updates = {}
						if (syncNames && user.name !== name) { // check if we should update name
							updates.name = name
						}

						if (user.blocked_alerts !== blocked) {
							updates.blocked_alerts = blocked
						}

						if (Object.keys(updates).length) {
							await this.query.updateQuery('humans', updates, { id })
							this.log.info(`Reconciliation (Discord) Update user ${id} ${name}`)
						}
					}
				}
			} else {
				const communityList = []

				// This rebuilds the community membership list based on roles.
				// If a community does not have any user roles, perhaps we should be taking those communities into account
				// later -- but the @everyone group could be added by users in config
				for (const community of Object.keys(this.config.areaSecurity.communities)) {
					if (roleList.some((role) => this.config.areaSecurity.communities[community].discord?.userRole?.includes(role))) {
						communityList.push(community.toLowerCase())
					}
				}

				const before = !!user && !user.admin_disable
				const after = !!communityList.length
				const areaRestriction = communityLogic.calculateLocationRestrictions(this.config, communityList)

				if (!before && after) {
					if (!user) {
						await this.query.insertOrUpdateQuery('humans', {
							id,
							type: 'discord:user',
							name,
							area: '[]',
							area_restriction: JSON.stringify(areaRestriction),
							community_membership: JSON.stringify(communityList),
							blocked_alerts: blocked,
						})
						await this.sendGreetings(id)
						this.log.info(`Reconciliation (Discord) Create user ${id} ${name} with communities ${communityList}`)
					} else if (user.admin_disable && user.disabled_date) {
						await this.query.updateQuery('humans', {
							admin_disable: 0,
							disabled_date: null,
							area_restriction: JSON.stringify(areaRestriction),
							community_membership: JSON.stringify(communityList),
							blocked_alerts: blocked,
						}, { id })
						this.log.info(`Reconciliation (Discord) Reactivate user ${id} ${name} with communities ${communityList}`)
						await this.sendGreetings(id)
					}
				}
				if (before && !after) {
					if (user && removeInvalidUsers) {
						await this.disableUser(user)
					}
				}
				if (before && after) {
					// check options for any changes here
					// should ignore admin?

					const updates = {}
					if (syncNames && user.name !== name) { // check if we should update name
						updates.name = name
					}

					if (user.blocked_alerts !== blocked) {
						updates.blocked_alerts = blocked
					}

					if (!user.area_restriction
						|| !haveSameContents(areaRestriction, JSON.parse(user.area_restriction))) {
						updates.area_restriction = JSON.stringify(areaRestriction)
					}

					if (!user.community_membership || !haveSameContents(communityList, JSON.parse(user.community_membership))) { // JSON!
						updates.community_membership = JSON.stringify(communityList)
					}
					if (Object.keys(updates).length) {
						await this.query.updateQuery('humans', updates, { id })
						this.log.info(`Reconciliation (Discord) Update user ${id} ${name} with communities ${communityList}`)
					}
				}
			}
		} catch (err) {
			this.log.error('Synchronisation of Poracle user failed with', err)
		}
	}

	async syncDiscordChannels(syncNames, syncNotes, removeInvalidChannels) {
		try {
			this.log.info('Reconciliation (Discord) Channel membership to Poracle users starting...')
			const usersToCheck = await this.query.selectAllQuery('humans', { type: 'discord:channel', admin_disable: 0 })

			for (const user of usersToCheck) {
				this.log.verbose(`Reconciliation (Discord) Check channel ${user.id} ${user.name}`)

				let channel

				try {
					channel = await this.client.channels.fetch(user.id)
				} catch (err) {
					if (err instanceof DiscordAPIError) {
						if (err.code === 10003) {
							if (removeInvalidChannels) {
								this.log.info(`Reconciliation (Discord) Disable channel ${user.id} ${user.name}`)

								await this.query.updateQuery('humans', {
									admin_disable: 1,
									disabled_date: this.query.dbNow(),
								}, { id: user.id })
							}
							// eslint-disable-next-line no-continue
							continue
						}

						this.log.info(`Reconciliation (Discord) Problem accessing channel ${user.id} ${user.name}`, err)
						// eslint-disable-next-line no-continue
						continue
					} else {
						throw err
					}
				}
				const { name } = channel
				const notes = `${channel.guild.name}${channel.parent ? ` / ${channel.parent.name}` : ''}`
				const updates = {}
				if (syncNames && user.name !== name) {
					updates.name = name
				}
				if (syncNotes && user.notes !== notes) {
					updates.notes = notes
				}

				// If there is currently an area restriction for a channel, ensure the location restrictions are correct
				if (user.area_restriction && user.community_membership) {
					const areaRestriction = communityLogic.calculateLocationRestrictions(this.config, JSON.parse(user.community_membership))
					if (!haveSameContents(areaRestriction, JSON.parse(user.area_restriction))) {
						updates.area_restriction = JSON.stringify(areaRestriction)
					}
				}

				if (Object.keys(updates).length) {
					await this.query.updateQuery('humans', updates, { id: user.id })
					this.log.info(`Reconciliation (Discord) Update channel ${user.id} ${name}`)
				}
			}
			this.log.verbose('Reconciliation (Discord) Channel membership to Poracle users complete...')
		} catch (err) {
			this.log.error('Verification of Poracle channels failed with', err)
		}
	}

	async syncDiscordRole(registerNewUsers, syncNames, removeInvalidUsers) {
		try {
			this.log.info('Reconciliation (Discord) User role membership to Poracle users starting...')
			let usersToCheck = await this.query.selectAllQuery('humans', { type: 'discord:user' })
			usersToCheck = usersToCheck.filter((user) => !this.config.discord.admins.includes(user.id))

			const discordUserList = await this.loadAllGuildUsers()

			const checked = []

			for (const user of usersToCheck) {
				checked.push(user.id)
				await this.reconcileUser(user.id, user, discordUserList[user.id], syncNames, removeInvalidUsers)
			}

			if (registerNewUsers) {
				this.log.verbose('Reconciliation (Discord) Find qualified users missing from Poracle users starting...')

				for (const id of Object.keys(discordUserList)) {
					if (!this.config.discord.admins.includes(id)
						&& !checked.includes(id)) {
						await this.reconcileUser(id, null, discordUserList[id], syncNames, removeInvalidUsers)
					}
				}
				this.log.verbose('Reconciliation (Discord) Find qualified users missing from Poracle users complete...')
			}
			this.log.verbose('Reconciliation (Discord) User role membership to Poracle users complete...')
		} catch (err) {
			this.log.error('Reconciliation (Discord) User role check failed', err)
		}
	}

	async loadAllGuildUsers() {
		const userList = {}

		this.log.verbose('Reconciliation (Discord) Loading all guild users...')

		for (const guildId of this.config.discord.guilds) {
			this.log.verbose(`Reconciliation (Discord) Loading guild id ${guildId} ...`)

			let guild
			try {
				guild = await this.client.guilds.fetch(guildId)
			} catch (err) {
				// if (err instanceof DiscordAPIError) {
				// 	if (err.httpStatus === 403) {
				// 		this.log.debug(`${guildId} no access`)
				// 		// eslint-disable-next-line no-continue
				// 		continue
				// 	}
				// 	this.log.info(`Reconciliation (Discord) Problem accessing guild ${guildId}`, err)
				// 	// eslint-disable-next-line no-continue
				// 	continue
				//
				// } else {
				this.log.error(`Reconciliation (Discord) Problem accessing guild ${guildId}`, err)
				throw err
				// }
			}
			const members = await guild.members.fetch({ force: false })
			let memberCount = 0
			for (const member of members.values()) {
				if (!member.user.bot) {
					const roleList = []

					memberCount++
					for (const role of member.roles.cache.values()) {
						roleList.push(role.id)
					}

					if (!userList[member.id]) {
						userList[member.id] = {
							name: emojiStrip(member.displayName),
							roles: roleList,
						}
					} else {
						userList[member.id].roles.push(...roleList)
					}
				}
			}
			this.log.verbose(`Reconciliation (Discord) Loading guild id ${guildId} complete with ${memberCount} members...`)
		}

		this.log.verbose('Reconciliation (Discord) Loading all guild users complete...')

		return userList
	}
}

module.exports = DiscordReconciliation
