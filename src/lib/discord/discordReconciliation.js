const { DiscordAPIError } = require('discord.js')
const emojiStrip = require('emoji-strip')
const communityLogic = require('../communityLogic')

const haveSameContents = (a, b) => {
	for (const v of new Set([...a, ...b])) {
		if (a.filter((e) => e === v).length !== b.filter((e) => e === v).length) return false
	}
	return true
}

class DiscordReconciliation {
	constructor(client, log, config, query, dts, mustache) {
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
			const greetingDts = this.dts.find((template) => template.type === 'greeting' && template.platform === 'discord' && template.default)
			const view = { prefix: this.config.discord.prefix }
			const greeting = this.mustache.compile(JSON.stringify(greetingDts.template)) /* grrr */
			await this.client.send(id, JSON.parse(greeting(view)))
		}
	}

	async disableUser(user) {
		if (this.config.general.roleCheckMode == 'disable-user') {
			if (!user.admin_disable) {
				await this.query.updateQuery('humans', {
					admin_disable: 1,
					disabled_date: this.query.dbNow(),
				}, { id: user.id })
				// client.logs.discord.log({
				// 	level: 'info',
				// 	message: `disabled ${oldPresence.user.username} because ${roleBefore.name} role removed`,
				// 	event: 'discord:roleCheck',
				// })
			}
		} else if (this.config.general.roleCheckMode == 'delete') {
			await this.query.deleteQuery('egg', { id: user.id })
			await this.query.deleteQuery('monsters', { id: user.id })
			await this.query.deleteQuery('raid', { id: user.id })
			await this.query.deleteQuery('quest', { id: user.id })
			await this.query.deleteQuery('lures', { id: user.id })
			await this.query.deleteQuery('profiles', { id: user.id })
			await this.query.deleteQuery('humans', { id: user.id })
			// client.logs.discord.log({
			// 	level: 'info',
			// 	message: `unregistered ${oldPresence.user.username} because ${roleBefore.name} role removed`,
			// 	event: 'discord:roleCheck',
			// })
		} else {
			// client.logs.discord.log({
			// 	level: 'info',
			// 	message: `${oldPresence.user.username} lost ${roleBefore.name} role but wasnt unregistered/disabled due to configuration`,
			// 	event: 'discord:roleCheck',
			// })
		}
	}

	async reconcileSingleUser(id, removeInvalidUsers) {
		const roleList = []

		let name = ''
		// const notes = ''

		for (const guildId of this.config.discord.guilds) {
			let guild
			try {
				guild = await this.client.guilds.fetch(guildId)
			} catch (err) {
				if (err instanceof DiscordAPIError) {
					if (err.httpStatus === 403) {
						// eslint-disable-next-line no-continue
						continue
						// this.logs.log.debug(`${guildID} no access`)

						// .push(...allUsers)
						// return invalidUsers
					}
				} else {
					throw err
				}
			}
			const guildMember = await guild.members.fetch({ user: id, force: true })
			if (guildMember) {
				if (!name) name = guildMember.displayName
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
		const roleList = discordUser ? discordUser.roles : []
		const name = discordUser ? discordUser.name : ''
		// const notes = ''

		if (!this.config.areaSecurity.enabled) {
			const before = !!user && !user.admin_disable
			const after = roleList.some((role) => this.config.discord.userRole.includes(role.id))

			if (!before && after) {
				if (!user) {
					await this.query.insertOrUpdateQuery('humans', {
						id,
						type: 'discord:user',
						name: emojiStrip(name),
						area: '[]',
					})
					await this.sendGreetings(id)

					// this.logs.discord.log({
					// 	level: 'info',
					// 	message: `registered ${oldPresence.user.username} because ${roleAfter.name} added`,
					// 	event: 'discord:roleCheck',
					// })
				} else if (this.config.general.roleCheckMode == 'disable-user') {
					if (user.admin_disable && user.disabled_date) {
						await this.query.updateQuery('humans', {
							admin_disable: 0,
							disabled_date: null,
						}, { id })
						// client.logs.discord.log({
						// 	level: 'info',
						// 	message: `enabled ${oldPresence.user.username} because ${roleAfter.name} added`,
						// 	event: 'discord:roleCheck',
						// })

						await this.sendGreetings(id)
					}
				}
			}
			if (before && !after) {
				if (user && removeInvalidUsers) {
					await this.disableUser(id)
				}
			}
		} else {
			const communityList = []

			for (const community of Object.keys(this.config.areaSecurity.communities)) {
				if (roleList.some((role) => this.config.areaSecurity.communities[community].discord.userRole(role.id))) {
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
						name: emojiStrip(name),
						area: '[]',
						area_restriction: JSON.stringify(areaRestriction),
						community_membership: JSON.stringify(communityList),
					})
					await this.sendGreetings(id)

					// this.logs.discord.log({
					// 	level: 'info',
					// 	message: `registered ${oldPresence.user.username} because ${roleAfter.name} added`,
					// 	event: 'discord:roleCheck',
					// })
				} else if (this.config.general.roleCheckMode == 'disable-user') {
					if (user.admin_disable && user.disabled_date) {
						await this.query.updateQuery('humans', {
							admin_disable: 0,
							disabled_date: null,
							area_restriction: JSON.stringify(areaRestriction),
							community_membership: JSON.stringify(communityList),
						}, { id })
						// client.logs.discord.log({
						// 	level: 'info',
						// 	message: `enabled ${oldPresence.user.username} because ${roleAfter.name} added`,
						// 	event: 'discord:roleCheck',
						// })

						await this.sendGreetings(id)
					}
				}
			}
			if (before && !after) {
				if (user && removeInvalidUsers) {
					await this.disableUser(id)
				}
			}
			if (before && after) {
				// check options for any changes here
				// should ignore admin?

				const updates = { }
				if (syncNames && user.name != name) { // check if we should update name
					updates.name = name
				}

				// if (user.notes != notes) {
				// 	updates.notes = notes
				// }

				if (!user.area_restriction || !haveSameContents(areaRestriction, JSON.parse(user.area_restriction))) {
					updates.area_restriction = JSON.stringify(areaRestriction)
				}

				if (!haveSameContents(communityList, JSON.parse(user.community_membership))) { // JSON!
					updates.area_restriction = JSON.stringify(areaRestriction)
				}
				if (Object.keys(updates).length) {
					await this.query.updateQuery('humans', updates, { id })
				}
			}
		}
	}

	async syncDiscordChannels(syncNames, syncNotes) {
		try {
			this.log.verbose('Verification of Discord channels to Poracle users starting...')
			const usersToCheck = await this.query.selectAllQuery('humans', { type: 'discord:channel', admin_disable: 0 })

			for (const user of usersToCheck) {
				let channel

				try {
					channel = await this.client.channels.fetch(user.id)
				} catch (err) {
					// how to tell deleted?
					// log discord channel gone
					// delete channel

				}
				const { name } = channel
				const notes = `${channel.guild.name} / ${channel.parent.name}`
				const updates = {}
				if (syncNames && user.name !== name) {
					updates.name = name
				}
				if (syncNotes && user.notes !== notes) {
					updates.notes = notes
				}
				if (Object.keys(updates).length) {
					this.query.updateQuery('humans', updates, { id: user.id })
				}
			}
		} catch (err) {
			this.log.error('Verification of Poracle channels failed with', err)
		}
	}

	async syncDiscordRole() {
		try {
			this.log.verbose('Verification of Discord role membership to Poracle users starting...')
			let usersToCheck = await this.query.selectAllQuery('humans', { type: 'discord:user', admin_disable: 0 })
			usersToCheck = usersToCheck.filter((user) => !this.config.discord.admins.includes(user.id))

			const discordUserList = await this.loadAllGuildUsers()

			const checked = []

			for (const user of usersToCheck) {
				checked.push(user.id)
				await this.reconcileUser(user.id, user, discordUserList[user.id])
			}

			if (this.config.reconciliation.discord.registerNewUsers) {
				for (const id of Object.keys(discordUserList)) {
					if (!this.config.discord.admins.includes(id)
						&& !checked.includes(id)) {
						await this.reconcileUser(id, null, discordUserList[id])
					}
				}
			}
		} catch (err) {
			this.log.error('Verification of Poracle user\'s roles failed with', err)
		}
	}

	async loadAllGuildUsers() {
		const userList = {}

		for (const guildId of this.config.discord.guilds) {
			let guild
			try {
				guild = await this.client.guilds.fetch(guildId)
			} catch (err) {
				if (err instanceof DiscordAPIError) {
					if (err.httpStatus === 403) {
						this.log.debug(`${guildId} no access`)
						// eslint-disable-next-line no-continue
						continue
					}
				} else {
					throw err
				}
			}

			for (const member of await guild.members.fetch({ force: false })) {
				const roleList = []

				for (const role of member.roles.cache.values()) {
					roleList.push(role.id)
				}

				if (!userList[member.id]) {
					userList[member.id] = {
						name: member.name,
						roles: roleList,
					}
				} else {
					userList[member.id].roles.push(...roleList)
				}
			}
		}
	}
}

module.exports = DiscordReconciliation