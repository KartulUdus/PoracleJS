const { Client } = require('discord.js')
const fs = require('fs')
const { S2 } = require('s2-geometry')
const mustache = require('handlebars')
const emojiStrip = require('emoji-strip')
const hastebin = require('hastebin-gen')

class DiscordCommando {
	constructor(token, query, config, logs, GameData, dts, geofence, translatorFactory) {
		this.token = token
		this.config = config
		this.query = query
		this.logs = logs
		this.GameData = GameData
		this.dts = dts
		this.geofence = geofence
		this.translatorFactory = translatorFactory
		this.translator = translatorFactory.default
		this.re = require('../../../util/regex')(this.translatorFactory)
		this.id = '0'
		this.bounceWorker()
	}

	async bounceWorker() {
		delete this.client
		this.client = new Client()
		try {
			this.client.on('error', (err) => {
				this.busy = true
				this.logs.log.error(`Discord worker #${this.id} \n bouncing`, err)
				this.bounceWorker()
			})
			this.client.on('rateLimit', (info) => {
				this.logs.log.warn(`#${this.id} Discord commando worker - will not be responding to commands -  429 rate limit hit - in timeout ${info.timeout ? info.timeout : 'Unknown timeout '} route ${info.route}`)
			})
			this.client.on('ready', () => {
				this.logs.log.info(`#${this.id} Discord commando - ${this.client.user.tag} ready for action`)

				this.busy = false
			})

			// We also need to make sure we're attaching the config to the CLIENT so it's accessible everywhere!
			this.client.config = this.config
			this.client.S2 = S2
			this.client.query = this.query
			this.client.emojiStrip = emojiStrip
			this.client.logs = this.logs
			this.client.dts = this.dts
			this.client.re = this.re
			this.client.geofence = this.geofence
			this.client.GameData = this.GameData
			this.client.mustache = mustache
			this.client.hastebin = hastebin
			this.client.translatorFactory = this.translatorFactory
			this.client.translator = this.translator
			this.client.hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$])', 'igm')

			fs.readdir(`${__dirname}/events/`, (err, files) => {
				if (err) return this.log.error(err)
				files.forEach((file) => {
					const event = require(`${__dirname}/events/${file}`) // eslint-disable-line global-require
					const eventName = file.split('.')[0]
					this.client.on(eventName, event.bind(null, this.client))
				})
			})

			this.client.commands = {}
			const enabledCommands = []
			fs.readdir(`${__dirname}/commands/`, (err, files) => {
				if (err) return this.log.error(err)
				files.forEach((file) => {
					if (!file.endsWith('.js')) return
					const props = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
					const commandName = file.split('.')[0]
					enabledCommands.push(`${this.config.discord.prefix}${commandName}`)
					this.client.commands[commandName] = props
				})

				if (this.client.config.general.availableLanguages && !this.client.config.general.disabledCommands.includes('poracle')) {
					for (const [, availableLanguage] of Object.entries(this.client.config.general.availableLanguages)) {
						const commandName = availableLanguage.poracle
						if (commandName && !enabledCommands.includes(`${this.config.discord.prefix}${commandName}`)) {
							const props = require(`${__dirname}/commands/poracle`)
							enabledCommands.push(`${this.config.discord.prefix}${commandName}`)
							this.client.commands[commandName] = props
						}
					}
				}

				this.logs.log.info(`Discord commando loaded ${enabledCommands.join(', ')} commands`)
			})

			this.client.login(this.token)
		} catch (err) {
			this.logs.log.error(`Discord commando didn't bounce, \n ${err.message} \n trying again`)
			await this.sleep(2000)
			return this.bounceWorker()
		}
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }
}

module.exports = DiscordCommando
