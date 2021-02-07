const { Client } = require('discord.js')
const axios = require('axios')
const fsp = require('fs').promises
const NodeCache = require('node-cache')

const { log } = require('../logger')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

class Worker {
	constructor(token, id, config, rehydrateTimeouts = false) {
		this.id = id
		this.token = token
		this.config = config
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
			log.error(`Discord worker #${this.id} \n bouncing`, err)
			this.bounceWorker()
		})
		this.client.on('warn', (err) => {
			log.error(`Discord worker #${this.id} \n bouncing`, err)
		})
		this.client.on('ready', () => {
			log.info(`discord worker #${this.id} ${this.client.user.tag} ready for action`)
			if (this.rehydrateTimeouts) {
				this.loadTimeouts()
			}
			this.busy = false
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
			log.error(`Discord worker didn't bounce, \n ${err.message} \n trying again`)
			this.sleep(2000)
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
			if (!user) {
				log.warn(`Originating connection to ${data.name}`)
				user = await this.client.users.fetch(data.target)
				await user.createDM()
			}
			const msg = await user.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
				this.discordMessageTimeouts.set(msg.id, { type: 'user', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}
			return true
		} catch (err) {
			log.error(`Failed to send Discord alert to ${data.name}`, err)
			log.error(JSON.stringify(data))
		}
		return true
	}

	async channelAlert(data) {
		try {
			const channel = await this.client.channels.fetch(data.target)
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			if (!channel) return log.warn(`channel ${data.name} not found`)
			const msg = await channel.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
				this.discordMessageTimeouts.set(msg.id, { type: 'channel', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}
			return true
		} catch (err) {
			log.error(`Failed to send Discord alert to ${data.name}`, err)
			log.error(JSON.stringify(data))
		}
		return true
	}

	async webhookAlert(firstData) {
		const data = firstData
		if (!data.target.match(hookRegex)) return log.warn(`Webhook, ${data.name} does not look like a link, exiting`)
		if (data.message.embed && data.message.embed.color) {
			data.message.embed.color = parseInt(data.message.embed.color.replace(/^#/, ''), 16)
		}

		if (data.message.embed) data.message.embeds = [data.message.embed]
		try {
			await this.axios({
				method: 'post',
				url: data.target,
				data: data.message,
			})
		} catch (err) {
			log.error(`Webhook ${data.name} failed with, ${err.message}`)
		}
		return true
	}

	async checkRole(guildID, users, roles) {
		const allUsers = users
		const validRoles = roles
		const invalidUsers = []
		const guild = await this.client.guilds.fetch(guildID)
		for (const user of allUsers) {
			log.info(`Checking role for: ${user.name} - ${user.id}`)
			const discorduser = await guild.members.fetch(user.id)
			if (discorduser.roles.cache.find((r) => validRoles.includes(r.id))) {
				log.info(`${discorduser.user.username} has a valid role`)
			} else {
				log.info(`${discorduser.user.username} doesn't have a valid role`)
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
						msg.delete()
					} else {
						const newTtlms = Math.max(msgData.t - now, 2000)
						const newTtl = Math.floor(newTtlms / 1000)
						msg.delete({ timeout: newTtlms, reason: 'Historic message delete after restart' })
						this.discordMessageTimeouts.set(key, msgData.v, newTtl)
					}
				}
			} catch (err) {
				log.info(`Error processing historic deletes ${err}`)
			}
		}
	}
}

module.exports = Worker
