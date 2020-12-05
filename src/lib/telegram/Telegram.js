const fs = require('fs')

class Telegram {
	constructor(config, log, dts, controller, query, telegraf, translator, commandParser, re) {
		this.config = config
		this.log = log
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
			.use(controller(query, dts, log, config, re, translator))
		this.commandFiles.map((file) => {
			if (!file.endsWith('.js')) return
			this.tempProps = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
			const commandName = file.split('.')[0]
			this.enabledCommands.push(this.translator.translate(commandName))
			this.bot.command(this.translator.translate(commandName), this.tempProps)
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

	static sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	init() {
		this.bot.launch()
	}

	async work(data) {
		this.busy = true
		switch (data.type) {
			case 'telegram:user': {
				await this.userAlert(data)
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
		const user = this.client.users.get(data.job.target)
		if (!user) return this.log.warning(`user ${data.name} not found`)
		try {
			await user.send(data.message.content || '', data.message)
			return user
		} catch (err) {
			throw this.log.error(`Failed to send Discord alert to ${data.name}, ${err.message}`)
		}
	}

	static async channelAlert(data) {
		this.log.info(data)
	}
}

module.exports = Telegram