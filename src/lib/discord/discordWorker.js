const { Client, DiscordAPIError } = require('discord.js')
const fsp = require('fs').promises
const NodeCache = require('node-cache')
const FairPromiseQueue = require('../FairPromiseQueue')

class Worker {
	constructor(token, id, config, logs, rehydrateTimeouts = false) {
		this.id = id
		this.token = token
		this.config = config
		this.logs = logs
		this.busy = true
		this.users = []
		this.userCount = 0
		this.client = {}
		this.rehydrateTimeouts = rehydrateTimeouts
		this.discordMessageTimeouts = new NodeCache()
		this.discordQueue = []
		this.queueProcessor = new FairPromiseQueue(this.discordQueue, this.config.tuning.concurrentDiscordDestinationsPerBot, ((entry) => entry.target))
		this.bounceWorker()
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	addUser(id) {
		this.users.push(id)
		this.userCount += 1
	}

	async setListeners() {
		this.client.on('error', (err) => {
			this.busy = true
			this.logs.discord.error(`Discord worker #${this.id} \n bouncing`, err)
			this.bounceWorker()
		})
		this.client.on('warn', (err) => {
			this.logs.discord.error(`Discord worker #${this.id} \n bouncing`, err)
		})
		this.client.on('ready', () => {
			this.logs.log.info(`discord worker #${this.id} ${this.client.user.tag} ready for action`)
			if (this.rehydrateTimeouts) {
				this.loadTimeouts()
			}
			this.busy = false
		})
		this.client.on('rateLimit', (info) => {
			const tag = (this.client && this.client.user) ? this.client.user.tag : ''
			this.logs.discord.warn(`#${this.id} Discord worker [${tag}] 429 rate limit hit - in timeout ${info.timeout ? info.timeout : 'Unknown timeout '} route ${info.route}`)
		})
	}

	async bounceWorker() {
		delete this.client
		this.client = new Client()
		try {
			await this.setListeners()
			await this.client.login(this.token)
			await this.client.user.setStatus('invisible')
		} catch (err) {
			this.logs.log.error(`Discord worker didn't bounce, \n ${err.message} \n trying again`)
			await this.sleep(2000)
			return this.bounceWorker()
		}
	}

	work(data) {
		this.discordQueue.push(data)
		if (!this.busy) {
			this.queueProcessor.run((work) => (this.sendAlert(work)))
		}
	}

	async sendAlert(data) {
		if ((Math.random() * 100) > 95) this.logs.log.verbose(`#${this.id} DiscordQueue is currently ${this.discordQueue.length}`) // todo: per minute

		switch (data.type) {
			case 'discord:user': {
				await this.userAlert(data)
				break
			}
			case 'discord:channel': {
				await this.channelAlert(data)
				break
			}
			default:
		}
	}

	async userAlert(data) {
		let user = this.client.users.cache.get(data.target)
		const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000

		try {
			const logReference = data.logReference ? data.logReference : 'Unknown'

			this.logs.discord.info(`${logReference}: #${this.id} -> ${data.name} ${data.target} USER Sending discord message${data.clean ? ' (clean)' : ''}`)

			if (!user) {
				user = await this.client.users.fetch(data.target)
				await user.createDM()
			}

			this.logs.discord.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} USER Sending discord message`, data.message)

			const msg = await user.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' }).catch(() => {})
				this.discordMessageTimeouts.set(msg.id, { type: 'user', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}
			return true
		} catch (err) {
			this.logs.discord.error(`${data.logReference}: #${this.id} Failed to send Discord alert to ${data.name}`, err, data)
			this.logs.discord.error(JSON.stringify(data))
		}
		return true
	}

	async channelAlert(data) {
		try {
			const logReference = data.logReference ? data.logReference : 'Unknown'

			this.logs.discord.info(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL Sending discord message${data.clean ? ' (clean)' : ''}`)
			const channel = await this.client.channels.fetch(data.target)
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000 + this.config.discord.messageDeleteDelay
			if (!channel) return this.logs.discord.warn(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL not found`)
			this.logs.discord.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL Sending discord message`, data.message)

			const msg = await channel.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' }).catch(() => {})
				this.discordMessageTimeouts.set(msg.id, { type: 'channel', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}
			return true
		} catch (err) {
			this.logs.discord.error(`${data.logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL failed to send Discord alert to `, err)
			this.logs.discord.error(JSON.stringify(data))
		}
		return true
	}

	async checkRole(guildID, users, roles) {
		const allUsers = users
		const validRoles = roles
		const invalidUsers = []
		let guild
		try {
			guild = await this.client.guilds.fetch(guildID)
		} catch (err) {
			if (err instanceof DiscordAPIError) {
				if (err.httpStatus === 403) {
					this.logs.log.debug(`${guildID} no access`)

					invalidUsers.push(...allUsers)
					return invalidUsers
				}
			} else {
				throw err
			}
		}
		for (const user of allUsers) {
			this.logs.log.debug(`Checking role for: ${user.name} - ${user.id}`)
			let discorduser
			try {
				discorduser = await guild.members.fetch(user.id)
			} catch (err) {
				if (err instanceof DiscordAPIError) {
					if (err.httpStatus === 404) {
						this.logs.log.debug(`${user.id} doesn't exist on guild ${guildID}`)
						invalidUsers.push(user)
						// eslint-disable-next-line no-continue
						continue
					}
				} else {
					throw err
				}
			}
			if (discorduser.roles.cache.find((r) => validRoles.includes(r.id))) {
				this.logs.log.debug(`${discorduser.user.username} has a valid role`)
			} else {
				this.logs.log.debug(`${discorduser.user.username} doesn't have a valid role`)
				invalidUsers.push(user)
			}
		}
		return invalidUsers
	}

	async saveTimeouts() {
		if (!this.client || !this.client.user || !this.client.user.tag) return

		// eslint-disable-next-line no-underscore-dangle
		this.discordMessageTimeouts._checkData(false)
		return fsp.writeFile(`.cache/cleancache-discord-${this.client.user.tag}.json`, JSON.stringify(this.discordMessageTimeouts.data), 'utf8')
	}

	async loadTimeouts() {
		let loaddatatxt

		try {
			loaddatatxt = await fsp.readFile(`.cache/cleancache-discord-${this.client.user.tag}.json`, 'utf8')
		} catch {
			return
		}

		const now = Date.now()

		const data = JSON.parse(loaddatatxt)
		for (const key of Object.keys(data)) {
			const msgData = data[key]
			let channel = null
			try {
				if (msgData.v.type == 'user') {
					const user = await this.client.users.fetch(msgData.v.id)
					channel = await user.createDM()
				}
				if (msgData.v.type == 'channel') {
					channel = await this.client.channels.fetch(msgData.v.id)
				}
				if (channel) {
					const msg = await channel.messages.fetch(key)
					if (msgData.t <= now) {
						msg.delete().catch(() => {})
					} else {
						const newTtlms = Math.max(msgData.t - now, 2000)
						const newTtl = Math.floor(newTtlms / 1000)
						msg.delete({ timeout: newTtlms, reason: 'Historic message delete after restart' }).catch(() => {})
						this.discordMessageTimeouts.set(key, msgData.v, newTtl)
					}
				}
			} catch (err) {
				this.logs.info(`Error processing historic deletes ${err}`)
			}
		}
	}
}

module.exports = Worker
