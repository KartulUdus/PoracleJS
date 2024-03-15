const {
	Client, DiscordAPIError,
	Intents,
	Options,
} = require('discord.js')
const fsp = require('fs').promises
const NodeCache = require('node-cache')
const { performance } = require('perf_hooks')
const FairPromiseQueue = require('../FairPromiseQueue')

const noop = () => { }

const messageCache = new NodeCache()

class Worker {
	constructor(token, id, config, logs, rehydrateTimeouts, statusActivity, query) {
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
		this.status = statusActivity.status
		this.activity = statusActivity.activity
		this.query = query
	}

	async start() {
		await this.bounceWorker()
	}

	// eslint-disable-next-line class-methods-use-this,no-promise-executor-return
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
			let channelId
			if (info.route) {
				const channelMatch = info.route.match(/\/channels\/(\d+)\//)
				if (channelMatch && channelMatch[1]) {
					const channel = this.client.channels.cache.get(channelMatch[1])
					if (channel) {
						channelId = channel.recipient && `DM:${channel.recipient.id}:${channel.recipient.username}`
							|| `${channel.id}:#${channel.name}`
					}
				}
			}
			this.logs.discord.warn(`#${this.id} Discord worker [${tag}] 429 rate limit hit - in timeout ${info.timeout ? info.timeout : 'Unknown timeout '} route ${info.route}${channelId ? ` (probably ${channelId})` : ''}`)
		})
	}

	async bounceWorker() {
		delete this.client

		const intents = new Intents()
		intents.add(Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_PRESENCES)

		this.client = new Client({
			intents,
			partials: ['CHANNEL', 'MESSAGE'], // , 'GUILD_MEMBER'],
			makeCache: Options.cacheWithLimits({
				MessageManager: 1,
				PresenceManager: 0,
			}),
		})

		try {
			await this.setListeners()
			await this.client.login(this.token)
			await this.client.user.setStatus(this.status)
			if (this.activity) await this.client.user.setActivity(this.activity)
		} catch (err) {
			if (err.code === 'DISALLOWED_INTENTS') {
				this.logs.log.error('Could not initialise discord', err)
				this.logs.log.error('Ensure that your discord bot Gateway intents for Presence, Server Members and Messages are on - see https://muckelba.github.io/poracleWiki/discordbot.html')
				process.exit(1)
			}
			this.logs.log.error(`Discord worker didn't bounce, \n ${err.message} \n trying again`)
			await this.sleep(2000)
			return this.bounceWorker()
		}
	}

	work(data) {
		this.discordQueue.push(data)
		if (!this.busy) {
			this.queueProcessor.run(
				async (work) => (this.sendAlert(work)),
				async (err) => {
					this.logs.log.error('Discord queueProcessor exception', err)
				},
			)
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
		const msgDeletionMs = ((data.tth.days * 86400) + (data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000

		try {
			const logReference = data.logReference ? data.logReference : 'Unknown'

			this.logs.discord.info(`${logReference}: #${this.id} -> ${data.name} ${data.target} USER Sending discord message${data.clean ? ' (clean)' : ''}`)

			if (!user) {
				user = await this.client.users.fetch(data.target)
				await user.createDM()
			}

			if (this.config.discord.uploadEmbedImages && data.message.embed && data.message.embed.image && data.message.embed.image.url) {
				const { url } = data.message.embed.image
				data.message.embed.image.url = 'attachment://map.png'
				data.message.files = [{ attachment: url, name: 'map.png' }]
			}

			const startTime = performance.now()
			if (data.message.embed) {
				data.message.embeds = [data.message.embed]
				delete data.message.embed
			}

			let previousMsg
			if (data.logReference) {
				previousMsg = messageCache.get(`${data.logReference}-${data.target}`)
				if (previousMsg) {
					data.message.reply = {
						messageReference: previousMsg,
						failIfNotExists: false,
					}
				}
			}

			this.logs.discord.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} USER Sending discord message`, data.message)

			const msg = await user.send(/* data.message.content || '', */ data.message)
			const endTime = performance.now();
			(this.config.logger.timingStats ? this.logs.discord.verbose : this.logs.discord.debug)(`${logReference}: #${this.id} -> ${data.name} ${data.target} USER (${endTime - startTime} ms)`)

			if (data.logReference) {
				messageCache.set(`${data.logReference}-${data.target}`, msg.id, Math.floor(msgDeletionMs / 1000) + 1)
			}

			if (data.clean) {
				setTimeout(async () => {
					try {
						await msg.delete()
					} catch (err) {
						this.logs.discord.error(`${data.logReference}: #${this.id} Failed to send clean Discord alert to ${data.name} ${data.target}`, err)
					}
				}, msgDeletionMs)
				this.discordMessageTimeouts.set(msg.id, { type: 'user', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}
			return true
		} catch (err) {
			await this.query.incrementQuery('humans', { id: data.target }, 'fails', 1)
			this.logs.discord.error(`${data.logReference}: #${this.id} Failed to send Discord alert to ${data.name}`, err, data)
			this.logs.discord.error(`${data.logReference}: ${JSON.stringify(data)}`)
		}
		return true
	}

	async channelAlert(data) {
		try {
			const logReference = data.logReference ? data.logReference : 'Unknown'

			this.logs.discord.info(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL Sending discord message${data.clean ? ' (clean)' : ''}`)
			const channel = await this.client.channels.fetch(data.target)
			const msgDeletionMs = ((data.tth.days * 86400) + (data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000 + this.config.discord.messageDeleteDelay
			if (!channel) return this.logs.discord.warn(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL not found`)
			this.logs.discord.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL Sending discord message`, data.message)

			if (this.config.discord.uploadEmbedImages && data.message.embed && data.message.embed.image && data.message.embed.image.url) {
				const { url } = data.message.embed.image
				data.message.embed.image.url = 'attachment://map.png'
				data.message.files = [{ attachment: url, name: 'map.png' }]
			}

			const startTime = performance.now()
			if (data.message.embed) {
				data.message.embeds = [data.message.embed]
				delete data.message.embed
			}

			let previousMsg
			if (data.logReference) {
				previousMsg = messageCache.get(`${data.logReference}-${data.target}`)
				if (previousMsg) {
					data.message.reply = {
						messageReference: previousMsg,
						failIfNotExists: false,
					}
				}
			}

			const msg = await channel.send(data.message)
			const endTime = performance.now();
			(this.config.logger.timingStats ? this.logs.discord.verbose : this.logs.discord.debug)(`${logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL (${endTime - startTime} ms)`)

			if (data.logReference) {
				messageCache.set(`${data.logReference}-${data.target}`, msg.id, Math.floor(msgDeletionMs / 1000) + 1)
			}

			if (data.clean) {
				setTimeout(async () => {
					try {
						await msg.delete()
					} catch (err) {
						this.logs.discord.error(`${data.logReference}: #${this.id} Failed to send clean Discord alert to ${data.name} ${data.target}`, err)
					}
				}, msgDeletionMs)
				this.discordMessageTimeouts.set(msg.id, { type: 'channel', id: data.target }, Math.floor(msgDeletionMs / 1000) + 1)
			}

			return true
		} catch (err) {
			await this.query.incrementQuery('humans', { id: data.target }, 'fails', 1)
			this.logs.discord.error(`${data.logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL failed to send Discord alert to `, err)
			this.logs.discord.error(`${data.logReference}: ${JSON.stringify(data)}`)
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

		let data
		try {
			data = JSON.parse(loaddatatxt)
		} catch {
			this.logs.log.warn(`Clean cache for discord tag ${this.client.user.tag} contains invalid data - ignoring`)
			return
		}

		for (const key of Object.keys(data)) {
			const msgData = data[key]
			let channel = null
			try {
				if (msgData.v.type === 'user') {
					const user = await this.client.users.fetch(msgData.v.id)
					channel = await user.createDM()
				}
				if (msgData.v.type === 'channel') {
					channel = await this.client.channels.fetch(msgData.v.id)
				}
				if (channel) {
					if (msgData.t <= now) {
						channel.messages.fetch(key).then((msg) => msg.delete()).catch(noop)
					} else {
						const newTtlms = Math.max(msgData.t - now, 2000)
						const newTtl = Math.floor(newTtlms / 1000)
						setTimeout(() => {
							channel.messages.fetch(key).then((msg) => msg.delete()).catch(noop)
						}, newTtlms)
						this.discordMessageTimeouts.set(key, msgData.v, newTtl)
					}
				}
			} catch (err) {
				this.logs.log.info(`Error processing historic deletes ${err}`)
			}
		}
	}
}

module.exports = Worker
