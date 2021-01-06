const fs = require('fs')

class Telegram {
	constructor(config, log, monsterData, utilData, dts, geofence, controller, query, telegraf, translator, commandParser, re) {
		this.config = config
		this.log = log
		this.monsterData = monsterData
		this.utilData = utilData
		this.geofence = geofence
		this.translator = translator
		this.commandParser = commandParser
		this.tempProps = {}
		this.controller = controller
		this.busy = true
		this.enabledCommands = []
		this.client = {}
		this.commandFiles = fs.readdirSync(`${__dirname}/commands`)
		this.bot = telegraf
		this.bot
			.use(commandParser(translator))
			.use(controller(query, dts, log, monsterData, utilData, geofence, config, re, translator))
		this.commandFiles.map((file) => {
			if (!file.endsWith('.js')) return
			this.tempProps = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
			const commandName = file.split('.')[0]
			if (!this.config.general.disabledCommands.includes(commandName)) {
				const translatedCommand = this.translator.translate(commandName)
				this.enabledCommands.push(commandName)
				this.bot.command(commandName, this.tempProps)
				if (translatedCommand != commandName) {
					this.enabledCommands.push(translatedCommand)
					this.bot.command(translatedCommand, this.tempProps)
				}
			}
		})
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
		this.log.warn(`Telegram sending message ${JSON.stringify(data.message)} / connection to ${data.name} ${data.target}`)
		try {
			const msgDeletionMs = ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) * 1000
			const messageIds = []
			try {
				if (data.message.sticker && data.message.sticker.length > 0) {
					const { message_id } = await this.bot.telegram.sendSticker(data.target, data.message.sticker, { disable_notification: true })
					messageIds.push(message_id)
				}
			} catch (err) {
				this.log.error(`Failed to send Telegram sticker ${data.message.sticker} to ${data.name}/${data.target}, ${err.message}`)
			}
			try {
				if (data.message.photo && data.message.photo.length > 0) {
					const { message_id } = await this.bot.telegram.sendPhoto(data.target, data.message.photo, { disable_notification: true })
					messageIds.push(message_id)
				}
			} catch (err) {
				this.log.error(`Failed to send Telegram photo ${data.message.photo} to ${data.name}/${data.target}, ${err.message}`)
			}
			const { message_id } = await this.bot.telegram.sendMessage(data.target, data.message.content || data.message || '', {
				parse_mode: 'Markdown',
				disable_web_page_preview: !data.message.webpage_preview,
			})
			messageIds.push(message_id)

			if (data.message.location) {
				const { message_id } = await this.bot.telegram.sendLocation(data.target, data.lat, data.lon, { disable_notification: true })
				messageIds.push(message_id)
			}

			if (data.clean) {
				this.log.warn(`Telegram setting to clean in ${msgDeletionMs}ms`)

				setTimeout(() => {
					for (const id of messageIds) {
						this.bot.telegram.deleteMessage(data.target, id)
					}
				}, msgDeletionMs)
			}
		} catch (err) {
			this.log.error(`Failed to send Telegram alert to ${data.name}/${data.target}, ${err.message}`)
		}
	}

	async groupAlert(data) {
		this.log.warn(`Telegram sending group message ${data.message} / connection to ${data.name} ${data.target}`)
		this.log.info(data)
		return this.userAlert(data)
	}

	async channelAlert(data) {
		this.log.warn(`Telegram sending channel message ${data.message} / connection to ${data.name} ${data.target}`)
		this.log.info(data)
		return this.userAlert(data)
	}
}

module.exports = Telegram