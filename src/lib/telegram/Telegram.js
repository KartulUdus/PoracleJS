const fs = require('fs')
const fsp = require('fs').promises
const NodeCache = require('node-cache')

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
		this.bot
			.use(commandParser(this.translatorFactory))
			.use(controller(query, dts, logs, GameData, geofence, config, re, translatorFactory))
		this.commandFiles.map((file) => {
			if (!file.endsWith('.js')) return
			this.tempProps = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
			const commandName = file.split('.')[0]
			if (!this.config.general.disabledCommands.includes(commandName)) {
				this.enabledCommands.push(commandName)
				this.bot.command(commandName, this.tempProps)

				const translatedCommands = this.translatorFactory.translateCommand(commandName)
				for (const translatedCommand of translatedCommands) {
					const normalisedCommand = translatedCommand.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
					if (normalisedCommand != commandName) {
						this.enabledCommands.push(normalisedCommand)
						this.bot.command(normalisedCommand, this.tempProps)
					}
				}
			}
		})

		if (this.config.general.availableLanguages && !this.config.general.disabledCommands.includes('poracle')) {
			for (const [, availableLanguage] of Object.entries(this.config.general.availableLanguages)) {
				const commandName = availableLanguage.poracle
				if (commandName && !this.enabledCommands.includes(commandName)) {
					const props = require(`${__dirname}/commands/poracle`)
					this.enabledCommands.push(commandName)
					this.bot.command(commandName, props)
				}
			}
		}
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

	async work(data) {
		this.busy = true
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

	async sendFormattedMessage(data) {
		try {
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			const messageIds = []
			const logReference = data.logReference ? data.logReference : 'Unknown'

			try {
				if (data.message.sticker && data.message.sticker.length > 0) {
					this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Sticker ${data.message.sticker}`)

					const msg = await this.bot.telegram.sendSticker(data.target, data.message.sticker, { disable_notification: true })
					messageIds.push(msg.message_id)
				}
			} catch (err) {
				this.logs.telegram.warn(`${logReference}: #${this.id} -> ${data.name} ${data.target} Failed to send Telegram sticker ${data.message.sticker}`, err)
			}
			try {
				if (data.message.photo && data.message.photo.length > 0) {
					this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Photo ${data.message.photo}`)

					const msg = await this.bot.telegram.sendPhoto(data.target, data.message.photo, { disable_notification: true })
					messageIds.push(msg.message_id)
				}
			} catch (err) {
				this.logs.telegram.error(`${logReference}: Failed to send Telegram photo ${data.message.photo} to ${data.name}/${data.target}`, err)
			}
			this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Content`, data.message)

			const msg = await this.bot.telegram.sendMessage(data.target, data.message.content || data.message || '', {
				parse_mode: 'Markdown',
				disable_web_page_preview: !data.message.webpage_preview,
			})
			messageIds.push(msg.message_id)

			if (data.message.location) {
				this.logs.telegram.debug(`${logReference}: #${this.id} -> ${data.name} ${data.target} Location ${data.lat} ${data.lat}`)

				try {
					// eslint-disable-next-line no-shadow
					const msg = await this.bot.telegram.sendLocation(data.target, data.lat, data.lon, { disable_notification: true })
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
						this.bot.telegram.deleteMessage(data.target, id)
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
					this.bot.telegram.deleteMessage(chatId, msgNo).catch(() => {})
				} else {
					const newTtlms = Math.max(msgData.t - now, 2000)
					const newTtl = Math.floor(newTtlms / 1000)
					setTimeout(() => {
						this.bot.telegram.deleteMessage(chatId, msgNo).catch(() => {})
					}, newTtlms)

					this.telegramMessageTimeouts.set(key, msgData.v, newTtl)
				}
			} catch (err) {
				this.log.info(`Error processing historic deletes ${err}`)
			}
		}
	}
}

module.exports = Telegram
