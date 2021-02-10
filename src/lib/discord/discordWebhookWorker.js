const axios = require('axios')
const PromiseQueue = require('../PromiseQueue')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

class DiscordWebhookWorker {
	constructor(config, logs) {
		this.config = config
		this.logs = logs
		this.busy = true
		this.users = []
		this.userCount = 0
		this.client = {}
		this.axios = axios
		this.webhookQueue = []
		this.queueProcessor = new PromiseQueue(this.webhookQueue, 5)
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	addUser(id) {
		this.users.push(id)
		this.userCount += 1
	}

	async sendAlert(data) {
		if ((Math.random() * 100) > 80) this.logs.log.info(`DiscordQueue[Webhook] is currently ${this.webhookQueue.length}`) // todo: per minute

		await this.webhookAlert(data)
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

			let retryLimit = 5
			let shouldRetry = true
			while (--retryLimit && shouldRetry) {
				shouldRetry = false
				// loop and sleep around issues...
				const res = await this.axios({
					method: 'post',
					url: data.target,
					data: data.message,
					validateStatus: ((status) => status < 500)
				})

				if (res.status === 429) {
					this.logs.discord.info(`${logReference}: ${data.name} WEBHOOK discord rate limit x-ratelimit-bucket ${res.headers["x-ratelimit-bucket"]} retry after ${res.headers["retry-after"]} limit ${res.headers["x-ratelimit-limit"]} global ${res.headers["x-ratelimit-global"]} reset after ${res.headers["x-ratelimit-reset-after"]} `)
//					const resetAfter = res.headers["x-ratelimit-reset-after"]
					const retryAfterMs = res.headers["retry-after"]
					await this.sleep(retryAfterMs)
					shouldRetry = true
				}
				this.logs.discord.silly(`${logReference}: ${data.name} WEBHOOK results ${data.target} ${res.statusText} ${res.status}`, res.headers)
			}
			if (retryLimit == 0) {
				this.logs.discord.info(`${logReference}: ${data.name} WEBHOOK given up`)
			}
		} catch (err) {
			this.logs.discord.error(`${data.logReference}: ${data.name} WEBHOOK failed`, err)
		}
		return true
	}

	work(data) {
		this.webhookQueue.push(data)
		this.queueProcessor.run((work) => (this.sendAlert(work)))
	}

}

module.exports = DiscordWebhookWorker
