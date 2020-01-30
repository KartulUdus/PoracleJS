const fs = require('fs')

class Telegram {
	constructor(config, log, dts, controller, query, telegraf, translator, commandParser) {
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
			.use(controller(controller, dts, log, config))
		this.commandFiles.map((file) => {
			if (!file.endsWith('.js')) return
			this.tempProps = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
			let commandName = file.split('.')[0]
			if (config.commands[commandName]) commandName = config.commands[commandName]
			this.enabledCommands.push(commandName)
			this.bot.command(this.translator.reverse(commandName), this.tempProps)
		})
		// this.work()
		this.init()
	}

	static sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }

	init() {
		this.bot.launch()
	}

	async work(data) {
		this.busy = true
		switch (data.type) {
			case 'telegram-user': {
				await this.userAlert(data)
				this.busy = false
				break
			}
			case 'telegram-channel': {
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