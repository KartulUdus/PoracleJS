const { Client } = require('discord.js')
const axios = require('axios')
const logs = require('../logger')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

class Worker {
	constructor(token, id, config) {
		this.id = id
		this.token = token
		this.config = config
		this.busy = true
		this.users = []
		this.userCount = 0
		this.client = {}
		this.axios = axios
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
			logs.log.error(`Discord worker #${this.id} \n bouncing`, err)
			this.bounceWorker()
		})
		this.client.on('warn', (err) => {
			logs.log.error(`Discord worker #${this.id} \n bouncing`, err)
		})
		this.client.on('ready', () => {
			logs.log.info(`discord worker #${this.id} ${this.client.user.tag} ready for action`)
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
			logs.log.error(`Discord worker didn't bounce, \n ${err.message} \n trying again`)
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
			logs.discord.info(`${data.name} ${data.target} USER Sending discord message${data.clean ? ' (clean)' : ''}`)
			if (!user) {
				user = await this.client.users.fetch(data.target)
				await user.createDM()
			}
			logs.discord.debug(`${data.name} ${data.target} USER Sending discord message`, data.message)

			const msg = await user.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
			}
			return true
		} catch (err) {
			logs.discord.error(`Failed to send Discord alert to ${data.name}`, err, data)
			logs.discord.error(JSON.stringify(data))
		}
		return true
	}

	async channelAlert(data) {
		try {
			logs.discord.info(`${data.name} ${data.target} CHANNEL Sending discord message${data.clean ? ' (clean)' : ''}`)
			const channel = await this.client.channels.fetch(data.target)
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			if (!channel) return logs.discord.warn(`${data.name} ${data.target} CHANNEL not found`)
			logs.discord.debug(`${data.name} ${data.target} CHANNEL Sending discord message`, data.message)

			const msg = await channel.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
			}
			return true
		} catch (err) {
			logs.discord.error(`${data.name} ${data.target} CHANNEL failed to send Discord alert to `, err)
			logs.discord.error(JSON.stringify(data))
		}
		return true
	}

	async webhookAlert(firstData) {
		const data = firstData
		if (!data.target.match(hookRegex)) return logs.discord.warn(`Webhook, ${data.name} does not look like a link, exiting`)
		if (data.message.embed && data.message.embed.color) {
			data.message.embed.color = parseInt(data.message.embed.color.replace(/^#/, ''), 16)
		}

		if (data.message.embed) data.message.embeds = [data.message.embed]
		try {
			logs.discord.info(`${data.name} WEBHOOK Sending discord message`)
			logs.discord.debug(`${data.name} WEBHOOK Sending discord message to ${data.target}`, data.message)

			await this.axios({
				method: 'post',
				url: data.target,
				data: data.message,
			})
		} catch (err) {
			logs.discord.error(`${data.name} WEBHOOK failed`, err)
		}
		return true
	}

	async checkRole(guildID, users, roles) {
		const allUsers = users
		const validRoles = roles
		const invalidUsers = []
		const guild = await this.client.guilds.fetch(guildID)
		for (const user of allUsers) {
			logs.log.info(`Checking role for: ${user.name} - ${user.id}`)
			const discorduser = await guild.members.fetch(user.id)
			if (discorduser.roles.cache.find((r) => validRoles.includes(r.id))) {
				logs.log.info(`${discorduser.user.username} has a valid role`)
			} else {
				logs.log.info(`${discorduser.user.username} doesn't have a valid role`)
				invalidUsers.push(user)
			}
		}
		return invalidUsers
	}
}

module.exports = Worker
