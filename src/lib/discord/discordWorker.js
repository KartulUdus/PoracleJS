const { Client } = require('discord.js')
const axios = require('axios')
const fsp = require('fs').promises
const NodeCache = require('node-cache')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

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
		this.axios = axios
		this.rehydrateTimeouts = rehydrateTimeouts
		this.discordMessageTimeouts = new NodeCache()
		this.bounceWorker()
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	addUser(id) {
		this.users.push(id)
		this.userCount += 1
	}

	async setLitseners() {
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
			this.logs.discord.warn(`#${this.id} Discord worker [${this.client.user.tag}] 429 rate limit hit - in timeout ${info.timeout ? info.timeout : 'Unknown timeout '} route ${info.route}`)
		})
	}

	async bounceWorker() {
		delete this.client
		this.client = new Client()
		try {
			await this.setLitseners()
			await this.client.login(this.token)
			await this.client.user.setStatus('invisible')
		} catch (err) {
			this.logs.log.error(`Discord worker didn't bounce, \n ${err.message} \n trying again`)
			await this.sleep(2000)
			return this.bounceWorker()
		}
	}

	async work(data) {
		this.busy = true
		switch (data.type) {
			case 'discord:user': {
				await this.userAlert(data)
				this.busy = false
				break
			}
			case 'discord:channel': {
				await this.channelAlert(data)
				this.busy = false
				break
			}
			case 'webhook': {
				await this.webhookAlert(data)
				this.busy = false
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
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
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
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			if (!channel) return this.logs.discord.warn(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL not found`)
			this.logs.discord.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL Sending discord message`, data.message)

			const msg = await channel.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
				this.discordMessageTimeouts.set(msg.id, { type: 'channel', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}
			return true
		} catch (err) {
			this.logs.discord.error(`${data.logReference}: ${data.name} ${data.target} CHANNEL failed to send Discord alert to `, err)
			this.logs.discord.error(JSON.stringify(data))
		}
		return true
	}

	async webhookAlert(firstData) {
		const data = firstData
		if (!data.target.match(hookRegex)) return this.logs.discord.warn(`Webhook, ${data.name} does not look like a link, exiting`)
		if (data.message.embed && data.message.embed.color) {
			data.message.embed.color = parseInt(data.message.embed.color.replace(/^#/, ''), 16)
		}

		if (data.message.embed) data.message.embeds = [data.message.embed]
		try {
			const logReference = data.logReference ? data.logReference : 'Unknown'

			this.logs.discord.info(`${logReference}: ${data.name} WEBHOOK Sending discord message`)
			this.logs.discord.debug(`${logReference}: ${data.name} WEBHOOK Sending discord message to ${data.target}`, data.message)

			await this.axios({
				method: 'post',
				url: data.target,
				data: data.message,
			})
		} catch (err) {
			this.logs.discord.error(`${data.logReference}: ${data.name} WEBHOOK failed`, err)
		}
		return true
	}

	async checkRole(guildID, users, roles) {
		const allUsers = users
		const validRoles = roles
		const invalidUsers = []
		const guild = await this.client.guilds.fetch(guildID)
		for (const user of allUsers) {
			this.logs.log.debug(`Checking role for: ${user.name} - ${user.id}`)
			const discorduser = await guild.members.fetch(user.id)
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
