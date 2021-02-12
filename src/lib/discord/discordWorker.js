const { Client } = require('discord.js')
const FairPromiseQueue = require('../FairPromiseQueue')

class Worker {
	constructor(token, id, config, logs) {
		this.id = id
		this.token = token
		this.config = config
		this.logs = logs
		this.busy = true
		this.users = []
		this.userCount = 0
		this.client = {}
		this.discordQueue = []
		this.queueProcessor = new FairPromiseQueue(this.discordQueue, 5, ((entry) => entry.target))
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
			this.busy = false
		})
		this.client.on('rateLimit', (info) => {
			this.logs.discord.warn(`#${this.id} Discord worker [${this.client.user.tag}] 429 Rate limit [Discord API] hit - must wait ${info.timeout ? info.timeout : 'Unknown timeout '} route ${info.route}`)
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
		if ((Math.random() * 100) > 95) this.logs.log.info(`#${this.id} DiscordQueue is currently ${this.discordQueue.length}`) // todo: per minute

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
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' }).catch(() => {})
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
}

module.exports = Worker
