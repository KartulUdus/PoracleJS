const fs = require('fs')

class Telegram {
	constructor(config, log, GameData, dts, geofence, controller, query, telegraf, translatorFactory, commandParser, re) {
		this.config = config
		this.log = log
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
		this.commandFiles = fs.readdirSync(`${__dirname}/commands`)
		this.bot = telegraf
		this.bot
			.use(commandParser(this.translatorFactory))
			.use(controller(query, dts, log, GameData, geofence, config, re, translatorFactory))
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
			log.error(`Ooops, encountered an error for ${ctx.updateType}`, err)
		})
		this.bot.start(() => {
			throw new Error('Telegraf error')
		})
		// this.work()
		this.log.info(`Telegram commando loaded ${this.enabledCommands.join(', ')} commands`)
		this.init()
	}

	static sleep(n) {
		return new Promise((resolve) => setTimeout(resolve, n))
	}

	init() {
		this.bot.launch()
		this.busy = false
	}

	async work(data) {
		this.log.warn(`Telegram asked to work ${data.type} ${data.target}`)

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

	async userAlert(data) {
		try {
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			const messageIds = []
			try {
				if (data.message.sticker && data.message.sticker.length > 0) {
					const msg = await this.bot.telegram.sendSticker(data.target, data.message.sticker, { disable_notification: true })
					messageIds.push(msg.message_id)
				}
			} catch (err) {
				this.log.error(`Failed to send Telegram sticker ${data.message.sticker} to ${data.name}/${data.target}, ${err.message}`)
			}
			try {
				if (data.message.photo && data.message.photo.length > 0) {
					const msg = await this.bot.telegram.sendPhoto(data.target, data.message.photo, { disable_notification: true })
					messageIds.push(msg.message_id)
				}
			} catch (err) {
				this.log.error(`Failed to send Telegram photo ${data.message.photo} to ${data.name}/${data.target}, ${err.message}`)
			}
			const msg = await this.bot.telegram.sendMessage(data.target, data.message.content || data.message || '', {
				parse_mode: 'Markdown',
				disable_web_page_preview: !data.message.webpage_preview,
			})
			messageIds.push(msg.message_id)

			if (data.message.location) {
				// eslint-disable-next-line no-shadow
				const msg = await this.bot.telegram.sendLocation(data.target, data.lat, data.lon, { disable_notification: true })
				messageIds.push(msg.message_id)
			}

			if (data.clean) {
				//				this.log.warn(`Telegram setting to clean in ${msgDeletionMs}ms`)
				setTimeout(() => {
					for (const id of messageIds) {
						this.bot.telegram.deleteMessage(data.target, id)
					}
				}, msgDeletionMs)
			}
			return true
		} catch (err) {
			this.log.error(`Failed to send Telegram alert to ${data.name}/${data.target}, ${err.message}`)
			return false
		}
	}

	async groupAlert(data) {
		return this.userAlert(data)
	}

	async channelAlert(data) {
		return this.userAlert(data)
	}
}

module.exports = Telegram
