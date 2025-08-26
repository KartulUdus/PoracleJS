const mustache = require('handlebars')
const emojiStrip = require('../../util/emojiStrip')
const communityLogic = require('../communityLogic')

const haveSameContents = (a, b) => {
	for (const v of new Set([...a, ...b])) {
		if (a.filter((e) => e === v).length !== b.filter((e) => e === v).length) return false
	}
	return true
}

class TelegramReconciliation {
	constructor(telegraf, log, config, query, dts) {
		this.telegraf = telegraf
		this.log = log
		this.config = config
		this.query = query
		this.dts = dts
		this.mustache = mustache
	}

	async sendGreetings(id) {
		if (!this.config.telegram.disableAutoGreetings) {
			const greetingDts = this.dts.find((template) => template.type === 'greeting' && template.platform === 'telegram' && template.default)
			if (greetingDts) {
				const view = { prefix: '/' }
				const compileMustache = this.mustache.compile(JSON.stringify(greetingDts.template))
				const greeting = JSON.parse(compileMustache(view))

				let messageText = ''
				const { fields } = greeting.embed

				for (const field of fields) {
					const fieldLine = `\n\n${field.name}\n\n${field.value}`
					if (messageText.length + fieldLine.length > 1024) {
						await this.telegraf.telegram.sendMessage(id, messageText)
						messageText = ''
					}
					messageText = messageText.concat(fieldLine)
				}
				await this.telegraf.telegram.sendMessage(id, messageText)
			}
		}
	}

	async sendGoodbye(id) {
		if (this.config.telegram.botGoodbyeMessage) {
			await this.telegraf.telegram.sendMessage(id, this.config.telegram.botGoodbyeMessage)
		}
	}

	async disableUser(user) {
		if (this.config.general.roleCheckMode === 'disable-user') {
			if (!user.admin_disable) {
				await this.query.updateQuery('humans', {
					admin_disable: 1,
					disabled_date: this.query.dbNow(),
				}, { id: user.id })
				this.log.info(`Reconciliation (Telegram) Disable user ${user.id} ${user.name}`)
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
			this.log.info(`Reconciliation (Telegram) Delete user ${user.id} ${user.name}`)
			await this.sendGoodbye(user.id)
		} else {
			this.log.info(`Reconciliation (Telegram) Not removing invalid user ${user.id} [roleCheckMode is ignored]`)
		}
	}

	async reconcileUser(id, user, telegramUser, syncNames, removeInvalidUsers) {
		try {
			this.log.verbose(`Reconciliation (Telegram) Check user ${id}`)

			const channelList = telegramUser ? telegramUser.channels : []
			const name = telegramUser ? telegramUser.name : ''
			// const notes = ''

			if (!this.config.areaSecurity.enabled) {
				const before = !!user && !user.admin_disable
				const after = channelList.some((channel) => this.config.telegram.channels.includes(channel))

				if (!before && after) {
					if (!user) {
						this.log.info(`Reconciliation (Telegram) Create user ${id} ${name}`)

						await this.query.insertOrUpdateQuery('humans', {
							id,
							type: 'telegram:user',
							name,
							area: '[]',
							community_membership: '[]',
						})
						await this.sendGreetings(id)
					} else if (user.admin_disable && user.disabled_date) {
						this.log.info(`Reconciliation (Telegram) Reactivate user ${id} ${name}`)

						await this.query.updateQuery('humans', {
							admin_disable: 0,
							disabled_date: null,
						}, { id })

						await this.sendGreetings(id)
					}
				}
				if (before && !after) {
					if (user && removeInvalidUsers) {
						await this.disableUser(user)
					}
				}
			} else {
				const communityList = []

				for (const community of Object.keys(this.config.areaSecurity.communities)) {
					if (channelList.some((channel) => this.config.areaSecurity.communities[community].telegram.channels.includes(channel))) {
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
							type: 'telegram:user',
							name,
							area: '[]',
							area_restriction: JSON.stringify(areaRestriction),
							community_membership: JSON.stringify(communityList),
						})
						await this.sendGreetings(id)
						this.log.info(`Reconciliation (Telegram) Create user ${id} ${name} with communities ${communityList}`)
					} else if (user.admin_disable && user.disabled_date) {
						await this.query.updateQuery('humans', {
							admin_disable: 0,
							disabled_date: null,
							area_restriction: JSON.stringify(areaRestriction),
							community_membership: JSON.stringify(communityList),
						}, { id })
						this.log.info(`Reconciliation (Telegram) Reactivate user ${id} ${name} with communities ${communityList}`)
						await this.sendGreetings(id)
					}
				}
				if (before && !after) {
					if (user && removeInvalidUsers) {
						await this.disableUser(user)
					}
				}
				if (before && after) {
					const updates = {}
					if (syncNames && user.name !== name) { // check if we should update name
						updates.name = name
					}

					// if (user.notes  !== notes) {
					// 	updates.notes = notes
					// }

					if (!user.area_restriction
						|| !haveSameContents(areaRestriction, JSON.parse(user.area_restriction))) {
						updates.area_restriction = JSON.stringify(areaRestriction)
					}

					if (!user.community_membership || !haveSameContents(communityList, JSON.parse(user.community_membership))) { // JSON!
						updates.community_membership = JSON.stringify(communityList)
					}
					if (Object.keys(updates).length) {
						await this.query.updateQuery('humans', updates, { id })
						this.log.info(`Reconciliation (Telegram) Update user ${id} ${name} with communities ${communityList}`)
					}
				}
			}
		} catch (err) {
			this.log.error('Synchronisation of Poracle user failed with', err)
		}
	}

	async syncTelegramUser(id, syncNames, removeInvalidUsers) {
		this.log.verbose('Reconciliation (Telegram) User role membership for single Poracle user starting...')

		try {
			const user = await this.query.selectOneQuery('humans', { id, type: 'telegram:user' })

			const channelList = this.getChannelList()

			const telegramInfo = await this.loadTelegramChannels(id, channelList)
			await this.reconcileUser(id, user, telegramInfo, syncNames, removeInvalidUsers)
		} catch (err) {
			this.log.error('Reconciliation (Telegram) User role check failed', err)
		}
	}

	getChannelList() {
		const channelList = []
		if (!this.config.areaSecurity.enabled) {
			channelList.push(...this.config.telegram.channels)
		} else {
			for (const community of Object.keys(this.config.areaSecurity.communities)) {
				const communityDetails = this.config.areaSecurity.communities[community]
				if (communityDetails.telegram && communityDetails.telegram.channels) {
					channelList.push(...this.config.areaSecurity.communities[community].telegram.channels)
				}
			}
		}
		return channelList
	}

	async syncTelegramUsers(syncNames, removeInvalidUsers) {
		try {
			this.log.verbose('Reconciliation (Telegram) User role membership to Poracle users starting...')
			let usersToCheck = await this.query.selectAllQuery('humans', { type: 'telegram:user' })
			usersToCheck = usersToCheck.filter((user) => !this.config.telegram.admins.includes(user.id))

			const channelList = this.getChannelList()

			for (const user of usersToCheck) {
				const telegramInfo = await this.loadTelegramChannels(user.id, channelList)
				await this.reconcileUser(user.id, user, telegramInfo, syncNames, removeInvalidUsers)
			}
		} catch (err) {
			this.log.error('Reconciliation (Telegram) User role check failed', err)
		}
	}

	async loadTelegramChannels(id, channelList) {
		try {
			const validChannels = []

			let name
			for (const group of channelList) {
				let telegramUser
				try {
					telegramUser = await this.telegraf.telegram.getChatMember(group, id)
				} catch (err) {
					if (err.response && err.response.error_code === 400) {
						if (err.response.description === 'Bad Request: user not found') {
							// User is not in chat group

							// eslint-disable-next-line no-continue
							continue
						} else {
							this.log.warn(`Reconciliation (Telegram) Load telegram channels for user failed - chat id '${group}' user id '${id}' code 400 - ${err.response.description}`)
							// eslint-disable-next-line no-continue
							continue
						}
					}
					this.log.error(`Reconciliation (Telegram) Load telegram channels failed - chat id '${group}'`, err)

					// eslint-disable-next-line no-continue
					continue
				}

				if (telegramUser) {
					if (!name) {
						name = emojiStrip(`${telegramUser.user.first_name}${telegramUser.user.last_name ? ` ${telegramUser.user.last_name}` : ''}${telegramUser.user.username ? ` [${telegramUser.user.username}]` : ''}`)
					}
					const { status } = telegramUser
					if (!['left', 'kicked'].includes(status)) {
						validChannels.push(group)
					}
				}
			}

			return {
				name,
				channels: validChannels,
			}
		} catch (err) {
			this.log.error('Reconciliation (Telegram) Load telegram channels failed', err)
		}
	}

	/**
	 * Update telegram channel list according to community changes
	 */
	async updateTelegramChannels() {
		try {
			this.log.info('Reconciliation (Telegram) Channel membership to Poracle users starting...')
			const channelsToCheck = await this.query.selectAllQuery('humans', { type: 'telegram:channel', admin_disable: 0 })
			const groupsToCheck = await this.query.selectAllQuery('humans', { type: 'telegram:group', admin_disable: 0 })

			for (const user of [...channelsToCheck, ...groupsToCheck]) {
				this.log.verbose(`Reconciliation (Telegram) Check channel ${user.id} ${user.name}`)

				const updates = { }

				// If there is currently an area restriction for a channel, ensure the location restrictions are correct
				if (user.area_restriction && user.community_membership) {
					const areaRestriction = communityLogic.calculateLocationRestrictions(this.config, JSON.parse(user.community_membership))
					if (!haveSameContents(areaRestriction, JSON.parse(user.area_restriction))) {
						updates.area_restriction = JSON.stringify(areaRestriction)
					}
				}

				if (Object.keys(updates).length) {
					await this.query.updateQuery('humans', updates, { id: user.id })
					this.log.info(`Reconciliation (Telegram) Update channel ${user.id} ${user.name}`)
				}
			}
			this.log.verbose('Reconciliation (Telegram) Channel membership to Poracle users complete...')
		} catch (err) {
			this.log.error('Verification of Poracle channels failed with', err)
		}
	}
}

module.exports = TelegramReconciliation
