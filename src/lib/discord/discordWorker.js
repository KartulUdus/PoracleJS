const { Client } = require('discord.js')
const axios = require('axios')
const { log } = require('../logger')

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
			log.error(`Discord worker #${this.id} \n bouncing`, err)
			this.bounceWorker()
		})
		this.client.on('warn', (err) => {
			log.error(`Discord worker #${this.id} \n bouncing`, err)
		})
		this.client.on('ready', () => {
			log.info(`discord worker #${this.id} ${this.client.user.tag} ready for action`)
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
		const user = this.client.users.get(data.target)
		const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
		if (!user) return log.warn(`user ${data.name} not found`)
		try {
			const msg = await user.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete(msgDeletionMs)
			}
			return true
		} catch (err) {
			log.error(`Failed to send Discord alert to ${data.name}`, err)
			log.error(JSON.stringify(data))
		}
		return true
	}

	async channelAlert(data) {
		const channel = this.client.channels.get(data.target)
		const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
		if (!channel) return log.warn(`channel ${data.name} not found`)
		try {
			const msg = await channel.send(data.message.content || '', data.message)
			if (data.clean) {
				msg.delete(msgDeletionMs)
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
}

module.exports = Worker
