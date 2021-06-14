const axios = require('axios')
const NodeCache = require('node-cache')
const fsp = require('fs').promises

const FairPromiseQueue = require('../FairPromiseQueue')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

const noop = () => {}

class DiscordWebhookWorker {
	constructor(config, logs, rehydrateTimeouts) {
		this.config = config
		this.logs = logs
		this.busy = true
		this.users = []
		this.userCount = 0
		this.client = {}
		this.webhookQueue = []
		this.rehydrateTimeouts = rehydrateTimeouts
		this.webhookTimeouts = new NodeCache()

		this.queueProcessor = new FairPromiseQueue(this.webhookQueue, this.config.tuning.concurrentDiscordWebhookConnections, ((t) => t.target))

		setImmediate(() => this.init())
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	async init() {
		if (this.rehydrateTimeouts) {
			await this.loadTimeouts()
		}
	}

	addUser(id) {
		this.users.push(id)
		this.userCount += 1
	}

	async sendAlert(data) {
		if ((Math.random() * 100) > 95) this.logs.log.verbose(`DiscordQueue[Webhook] is currently ${this.webhookQueue.length}`) // todo: per minute

		await this.webhookAlert(data)
	}

	async retrySender(senderId, fn) {
		let retry
		let res
		let retryCount = 0

		do {
			retry = false

			try {
				res = await fn()
				if (res.status === 429) {
					this.logs.discord.warn(`${senderId} WEBHOOK 429 Rate limit [Discord Webhook] retryCount ${retryCount} x-ratelimit-bucket ${res.headers['x-ratelimit-bucket']} retry after ${res.headers['retry-after']} limit ${res.headers['x-ratelimit-limit']} global ${res.headers['x-ratelimit-global']} reset after ${res.headers['x-ratelimit-reset-after']} `)
					//	const resetAfter = res.headers["x-ratelimit-reset-after"]

					const retryAfterMs = res.headers['retry-after']
					if (!res.headers.via) {
						this.logs.discord.error(`${senderId} WEBHOOK 429 Rate limit [Discord Webhook] TELL @JABES ON DISCORD THIS COULD BE FROM CLOUDFLARE: ${retryAfterMs}`)
					}
					await this.sleep(+retryAfterMs + Math.random() * 5000)
					retry = true
					retryCount++
				}
			} catch (err) {
				// Cancel indicates we hit the timeout, which we will retry (but only up to 5 times)
				if (err instanceof axios.Cancel && retryCount < 5) {
					this.logs.discord.warn(`${senderId} WEBHOOK Timeout, will retry...`)
					await this.sleep(2500 + Math.random() * 7500)
					retry = true
					retryCount++
				} else {
					throw err
				}
			}
		} while (retry === true && retryCount < 10)

		if (retryCount === 10 && retry) {
			this.logs.discord.warn(`${senderId} WEBHOOK given up sending after retries`)
		}
		return res
	}

	async webhookAlert(firstData) {
		const data = firstData
		if (!data.target.match(hookRegex)) return this.logs.discord.warn(`Webhook, ${data.name} does not look like a link, exiting`)
		if (data.message.embed && data.message.embed.color) {
			data.message.embed.color = parseInt(data.message.embed.color.replace(/^#/, ''), 16)
		}

		if (data.message.embed) data.message.embeds = [data.message.embed]
		try {
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000

			const logReference = data.logReference ? data.logReference : 'Unknown'

			this.logs.discord.info(`${logReference}: http(s)> ${data.name} WEBHOOK Sending discord message`)
			this.logs.discord.debug(`${logReference}: http(s)> ${data.name} WEBHOOK Sending discord message to ${data.target}`, data.message)

			const senderId = `${logReference}: ${data.name}`
			const url = data.clean ? `${data.target}?wait=true` : data.target

			const timeoutMs = this.config.tuning.discordTimeout || 10000
			const res = await this.retrySender(senderId, async () => {
				const source = axios.CancelToken.source()
				const timeout = setTimeout(() => {
					source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
					// Timeout Logic
				}, timeoutMs)

				const result = await axios({
					method: 'post',
					url,
					data: data.message,
					validateStatus: ((status) => status < 500),
					cancelToken: source.token,
				})

				clearTimeout(timeout)
				return result
			})

			if (res.status < 200 || res.status > 299) {
				this.logs.discord.warn(`${logReference}: ${data.name} WEBHOOK Got ${res.status} ${res.statusText}`)
				this.logs.discord.warn(`${logReference}: ${JSON.stringify(data.message)}`)
			} else {
				this.logs.discord.verbose(`${logReference}: ${data.name} WEBHOOK Got ${res.status} ${res.statusText}`)
			}
			this.logs.discord.silly(`${logReference}: ${data.name} WEBHOOK results ${data.target} ${res.statusText} ${res.status}`, res.headers)

			if (data.clean && res.status == 200) {
				const msgId = res.data.id
				this.webhookTimeouts.set(msgId, data.target, Math.floor(msgDeletionMs / 1000) + 1)

				setTimeout(async () => this.deleteMessage(logReference, data.name, data.target, msgId),
					msgDeletionMs)
			}
		} catch (err) {
			this.logs.discord.error(`${data.logReference}: ${data.name} WEBHOOK failed`, err)
		}
		return true
	}

	work(data) {
		this.webhookQueue.push(data)
		this.queueProcessor.run(async (work) => (this.sendAlert(work)),
			async (err) => {
				this.logs.log.error('Discord Webhook queueProcessor exception', err)
			})
	}

	async saveTimeouts() {
		// eslint-disable-next-line no-underscore-dangle
		this.webhookTimeouts._checkData(false)
		return fsp.writeFile('.cache/cleancache-webhookWorker.json', JSON.stringify(this.webhookTimeouts.data), 'utf8')
	}

	async deleteMessage(logReference, hookName, hookUrl, msgId) {
		const deleteUrl = `${hookUrl}/messages/${msgId}`
		const timeoutMs = this.config.tuning.discordTimeout || 10000

		this.logs.discord.verbose(`${logReference}: http(s)> ${hookName} WEBHOOK Cleaning discord message`)

		try {
			const cleanRes = await this.retrySender(`${logReference} (clean)`, async () => {
				const source = axios.CancelToken.source()
				const timeout = setTimeout(() => {
					source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
					// Timeout Logic
				}, timeoutMs)

				const result = await axios({
					method: 'delete',
					url: deleteUrl,
					cancelToken: source.token,
					validateStatus: ((status) => status < 500),
				})

				clearTimeout(timeout)
				return result
			})
			if (cleanRes.status < 200 || cleanRes.status > 299) {
				this.logs.discord.warn(`${logReference}: ${hookName} WEBHOOK Clean got ${cleanRes.status} ${cleanRes.statusText}`)
			}
		} catch (err) {
			this.logs.discord.error(`${logReference}: ${hookName} WEBHOOK Clean failed`, err)
		}
	}

	async loadTimeouts() {
		let loaddatatxt

		try {
			loaddatatxt = await fsp.readFile('.cache/cleancache-webhookWorker.json', 'utf8')
		} catch {
			return
		}

		const now = Date.now()

		const data = JSON.parse(loaddatatxt)
		for (const key of Object.keys(data)) {
			const msgData = data[key]

			try {
				const msgId = key
				const hookUrl = msgData.v
				if (msgData.t <= now) {
					setImmediate(() => {
						this.deleteMessage('Rehydrated delete', 'unknown', hookUrl, msgId).catch(noop)
					})
				} else {
					const newTtlms = Math.max(msgData.t - now, 2000)
					const newTtl = Math.floor(newTtlms / 1000)
					setTimeout(() => {
						this.deleteMessage('Rehydrated delete', 'unknown', hookUrl, msgId).catch(noop)
					}, newTtlms)

					this.webhookTimeouts.set(key, msgData.v, newTtl)
				}
			} catch (err) {
				this.logs.log.info(`Error processing historic deletes ${err}`)
			}
		}
	}
}

module.exports = DiscordWebhookWorker
