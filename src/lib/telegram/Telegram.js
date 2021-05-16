const fs = require('fs')
const fsp = require('fs').promises
const NodeCache = require('node-cache')
const emojiStrip = require('../../util/emojiStrip')
const FairPromiseQueue = require('../FairPromiseQueue')

const noop = () => {}

class Telegram {
	constructor(id, config, logs, GameData, dts, geofence, controller, query, telegraf, translatorFactory, commandParser, re, rehydrateTimeouts = false) {
		this.config = config
		this.logs = logs
		this.GameData = GameData
		this.geofence = geofence
		this.translatorFactory = translatorFactory
		this.translator = translatorFactory.default
		this.commandParser = commandParser
		this.tempProps = {}
		this.controller = controller
		this.busy = true
		this.enabledCommands = []
		this.client = {}
		this.rehydrateTimeouts = rehydrateTimeouts
		this.telegramMessageTimeouts = new NodeCache()
		this.commandFiles = fs.readdirSync(`${__dirname}/commands`)
		this.bot = telegraf
		this.id = id
		this.telegramQueue = []
		this.queueProcessor = new FairPromiseQueue(this.telegramQueue, this.config.tuning.concurrentTelegramDestinationsPerBot, ((entry) => entry.target))
		this.bot
			.use(commandParser(this.translatorFactory))
			.use(controller(query, dts, logs, GameData, geofence, config, re, translatorFactory, emojiStrip))

		this.commands = {}

		// Handle identify special case on channels & in conversations

		this.bot.on('channel_post', (ctx, next) => {
			if (ctx.update.channel_post
				&& ctx.update.channel_post.text
				&& ctx.update.channel_post.text.startsWith('/identify')) {
				ctx.reply(`This channel is id: [ ${ctx.update.channel_post.chat.id} ] and your id is: unknown - this is a channel (and can't be used for bot registration)`)
			}
			return next()
		})

		this.bot.hears(/^\/identify/, (ctx) => {
			if (ctx.update.message.chat.type === 'private') {
				ctx.reply(`This is a private message and your id is: [ ${ctx.update.message.from.id} ]`)
			} else {
				ctx.reply(`This channel is id: [ ${ctx.update.message.chat.id} ] and your id is: [ ${ctx.update.message.from.id} ]`)
			}
		})

		/* load available commands into command structure */
		this.commandFiles.map((file) => {
			if (!file.endsWith('.js')) return
			this.tempProps = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
			const commandName = file.split('.')[0]
			if (!this.config.general.disabledCommands.includes(commandName)) {
				this.enabledCommands.push(commandName)
				this.commands[commandName] = this.tempProps

				const translatedCommands = this.translatorFactory.translateCommand(commandName)
				for (const translatedCommand of translatedCommands) {
					if (translatedCommand != commandName) {
						this.enabledCommands.push(translatedCommand)
						this.commands[translatedCommand] = this.tempProps
					}
				}
			}
		})

		/* install extra middleware for telegram location sharing function, because .command(...) only catch text type messages */
		if (!this.config.general.disabledCommands.includes('location')) {
			const locationHandler = require(`${__dirname}/commands/location`)
			this.bot.on('location', locationHandler)
		}

		if (this.config.general.availableLanguages && !this.config.general.disabledCommands.includes('poracle')) {
			for (const [, availableLanguage] of Object.entries(this.config.general.availableLanguages)) {
				const commandName = availableLanguage.poracle
				if (commandName && !this.enabledCommands.includes(commandName)) {
					const props = require(`${__dirname}/commands/poracle`)
					this.enabledCommands.push(commandName)
					this.commands[commandName] = props
				}
			}
		}

		// use 'hears' to launch our command processor rather than bot commands
		this.bot.on('text', async (ctx) => this.processCommand(ctx))

		this.bot.catch((err, ctx) => {
			this.logs.log.error(`Ooops, encountered an error for ${ctx.updateType}`, err)
		})
		this.bot.start(() => {
			throw new Error('Telegraf error')
		})
		// this.work()
		this.logs.log.info(`Telegram commando loaded ${this.enabledCommands.join(', ')} commands`)
		this.init()
	}

	async processCommand(ctx) {
		const { command } = ctx.state
		if (!command) return
		if (command.bot && command.bot.toLowerCase() != ctx.botInfo.username.toLowerCase()) return
		if (Object.keys(this.commands).includes(command.command)) {
			return this.commands[command.command](ctx)
		}
		if (ctx.update.message.chat.type === 'private'
				&& this.config.telegram.unrecognisedCommandMessage) {
			ctx.reply(this.config.telegram.unrecognisedCommandMessage)
		}
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) {
		return new Promise((resolve) => setTimeout(resolve, n))
	}

	init() {
		this.bot.launch()
		if (this.rehydrateTimeouts) {
			this.loadTimeouts()
		}
		this.busy = false
	}

	work(data) {
		this.telegramQueue.push(data)
		if (!this.busy) {
			this.queueProcessor.run(async (work) => (this.sendAlert(work)),
				async (err) => {
					this.logs.log.error('Telegram queueProcessor exception', err)
				})
		}
	}

	async sendAlert(data) {
		if ((Math.random() * 100) > 95) this.logs.log.verbose(`#${this.id} TelegramQueue is currently ${this.telegramQueue.length}`) // todo: per minute

		switch (data.type) {
			case 'telegram:user': {
				await this.userAlert(data)
				this.busy = false
				break
			}
			case 'telegram:group': {
				await this.groupAlert(data)
				this.busy = false
				break
			}
			case 'telegram:channel': {
				await this.channelAlert(data)
				this.busy = false
				break
			}
			default:
		}
	}

	async retrySender(senderId, fn) {
		let retry
		let res
		let retryCount = 0

		do {
			retry = false
			try {
				res = await fn()
			} catch (err) {
				if (err.code == 429) {
					const retryAfter = (err.response && err.response.parameters) ? err.response.parameters.retry_after : 30
					this.logs.telegram.warn(`${senderId} 429 Rate limit [Telegram] - wait for ${retryAfter} retry count ${retryCount}`)
					await this.sleep(retryAfter * 1000)
					retry = true
					if (retryCount++ == 5) {
						throw err
					}
				} else {
					throw err
				}
			}
		} while (retry === true)
		return res
	}

	async sendFormattedMessage(data) {
		try {
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			const messageIds = []
			const logReference = data.logReference ? data.logReference : 'Unknown'

			const senderId = `${logReference}: ${data.name} ${data.target}`
			try {
				if (data.message.sticker && data.message.sticker.length > 0) {
					this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Sticker ${data.message.sticker}`)

					const msg = await this.retrySender(senderId,
						async () => this.bot.telegram.sendSticker(data.target, data.message.sticker, { disable_notification: true }))
					messageIds.push(msg.message_id)
				}
			} catch (err) {
				this.logs.telegram.info(`${logReference}: #${this.id} -> ${data.name} ${data.target} Failed to send Telegram sticker ${data.message.sticker}`)
			}
			try {
				if (data.message.photo && data.message.photo.length > 0) {
					this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Photo ${data.message.photo}`)

					const msg = await this.retrySender(senderId,
						async () => this.bot.telegram.sendPhoto(data.target, data.message.photo, { disable_notification: true }))
					messageIds.push(msg.message_id)
				}
			} catch (err) {
				this.logs.telegram.error(`${logReference}: Failed to send Telegram photo ${data.message.photo} to ${data.name}/${data.target}`, err)
			}
			this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Content`, data.message)

			const msg = await this.retrySender(senderId,
				async () => this.bot.telegram.sendMessage(data.target, data.message.content || data.message || '', {
					parse_mode: 'Markdown',
					disable_web_page_preview: !data.message.webpage_preview,
				}))
			messageIds.push(msg.message_id)

			if (data.message.location) {
				this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Location ${data.lat} ${data.lat}`)

				try {
					// eslint-disable-next-line no-shadow
					const msg = await this.retrySender(senderId,
						async () => this.bot.telegram.sendLocation(data.target, data.lat, data.lon, { disable_notification: true }))
					messageIds.push(msg.message_id)
				} catch (err) {
					this.logs.telegram.error(`${logReference}: #${this.id} -> ${data.name} ${data.target}  Failed to send Telegram location ${data.lat} ${data.lat}`, err)
				}
			}

			if (data.clean) {
				//				this.log.warn(`Telegram setting to clean in ${msgDeletionMs}ms`)
				for (const id of messageIds) {
					this.telegramMessageTimeouts.set(`${id}:${data.target}`, data.target, Math.floor(msgDeletionMs / 1000) + 1)
				}
				setTimeout(() => {
					for (const id of messageIds) {
						this.retrySender(`${senderId} (clean)`, async () => this.bot.telegram.deleteMessage(data.target, id)).catch(noop)
					}
				}, msgDeletionMs)
			}
			return true
		} catch (err) {
			this.logs.telegram.error(`${data.logReference}: #${this.id} -> ${data.name} ${data.target}  Failed to send Telegram alert`, err)
			return false
		}
	}

	async userAlert(data) {
		this.logs.telegram.info(`${data.logReference}: #${this.id} -> ${data.name} ${data.target} USER Sending telegram message${data.clean ? ' (clean)' : ''}`)

		return this.sendFormattedMessage(data)
	}

	async groupAlert(data) {
		this.logs.telegram.info(`${data.logReference}: #${this.id} -> ${data.name} ${data.target} GROUP Sending telegram message${data.clean ? ' (clean)' : ''}`)

		return this.sendFormattedMessage(data)
	}

	async channelAlert(data) {
		this.logs.telegram.info(`${data.logReference}: #${this.id} -> ${data.name} ${data.target} CHANNEL Sending telegram message${data.clean ? ' (clean)' : ''}`)

		return this.sendFormattedMessage(data)
	}

	async saveTimeouts() {
		// eslint-disable-next-line no-underscore-dangle
		this.telegramMessageTimeouts._checkData(false)
		return fsp.writeFile(`.cache/cleancache-telegram-${this.bot.token}.json`, JSON.stringify(this.telegramMessageTimeouts.data), 'utf8')
	}

	async loadTimeouts() {
		let loaddatatxt

		try {
			loaddatatxt = await fsp.readFile(`.cache/cleancache-telegram-${this.bot.token}.json`, 'utf8')
		} catch {
			return
		}

		const now = Date.now()

		const data = JSON.parse(loaddatatxt)
		for (const key of Object.keys(data)) {
			const msgData = data[key]

			try {
				const msgNo = parseInt(key.split(':')[0], 10)
				const chatId = parseInt(msgData.v, 10)
				if (msgData.t <= now) {
					this.bot.telegram.deleteMessage(chatId, msgNo).catch(noop)
				} else {
					const newTtlms = Math.max(msgData.t - now, 2000)
					const newTtl = Math.floor(newTtlms / 1000)
					setTimeout(() => {
						this.bot.telegram.deleteMessage(chatId, msgNo).catch(noop)
					}, newTtlms)

					this.telegramMessageTimeouts.set(key, msgData.v, newTtl)
				}
			} catch (err) {
				this.logs.log.info(`Error processing historic deletes ${err}`)
			}
		}
	}
}

module.exports = Telegram
