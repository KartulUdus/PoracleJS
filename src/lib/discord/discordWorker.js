const { Client } = require('discord.js')
const axios = require('axios')
const log = require('../../lib/logger')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

class Worker {
	constructor(token, id, config) {
		this.id = id
		this.token = token
		this.config = config
		this.busy = true
		this.users = []
		this.client = {}
		this.bounceWorker()
		this.work()
	}

	static sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	async setLitseners() {
		this.client.on('error', (err) => {
			this.busy = true
			log.error(`Discord commando ${err.message} \n bouncing`)
			this.bounceWorker()
		})
		this.client.on('warn', (err) => {
			log.error(`Discord commando ${err.message} \n bouncing`)
		})
		this.client.on('ready', () => {
			log.info(`discord commando ${this.client.user.tag} ready for action`)
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
			log.error(`Discord commando didn't bounce, \n ${err.message} \n trying again`)
			await this.sleep(2000)
			return this.bounceWorker()
		}
	}

	async work(data) {
		this.busy = true
		switch (data.type) {
			case 'discord-user': {
				await this.userAlert(data)
				this.busy = false
				break
			}
			case 'discord-channel': {
				await this.channelAlert(data)
				this.busy = false
				break
			}
			case 'discord-webhook': {
				await this.webhookAlert(data)
				this.busy = false
				break
			}
			default:
		}
	}

	async userAlert(data) {
		 
		const user = this.client.users.get(data.job.target)
		if (!user) return this.log.warning(`user ${data.name} not found`)
		try {
			await user.send(data.message.content || '', data.message)
			return user
		} catch (err) {
			throw this.log.error(`Failed to send Discord alert to ${data.name}, ${err.message}`)
		}
		
	}

	async webhookAlert(data) {
		 
		if (!data.target.match(hookRegex)) return this.log.warn(`Webhook, ${data.name} does not look like a link, exiting`)
		if (data.message.embed) data.message.embeds = [data.message.embed]
		try {
			await axios({
				method: 'post',
				url: data.target,
				data: data.message,
			})
		} catch (err) {
			this.log.error(`Webhook ${data.name} failed with, ${err.message}`)
		}
		return
		
	}

	async channelAlert(data) {

	}
}

module.exports = Worker