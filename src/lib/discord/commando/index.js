const { Client } = require('discord.js')
const Enmap = require('enmap')
const fs = require('fs')
const { S2 } = require('s2-geometry')
const mustache = require('handlebars')
const emojiStrip = require('emoji-strip')
const hastebin = require('hastebin-gen')
const Controller = require('../../../controllers/controller')

class DiscordCommando {
	constructor(knex, config, log, monsterData, utilData, dts, geofence, translator) {
		this.config = config
		this.query = new Controller(knex, config)
		this.log = log
		this.monsterData = monsterData
		this.utilData = utilData
		this.dts = dts
		this.geofence = geofence
		this.translator = translator
		this.re = require('../../../util/regex')(translator)
		this.bounceWorker()
	}

	async bounceWorker() {
		delete this.client
		this.client = new Client()
		try {
			this.client.on('error', (err) => {
				this.busy = true
				this.log.error(`Discord worker #${this.id} \n bouncing`, err)
				this.bounceWorker()
			})
			// We also need to make sure we're attaching the config to the CLIENT so it's accessible everywhere!
			this.client.config = this.config
			this.client.S2 = S2
			this.client.query = this.query
			this.client.emojiStrip = emojiStrip
			this.client.log = this.log
			this.client.dts = this.dts
			this.client.re = this.re
			this.client.geofence = this.geofence
			this.client.monsters = this.monsterData
			this.client.utilData = this.utilData
			this.client.mustache = mustache
			this.client.hastebin = hastebin
			this.client.translator = this.translator
			this.client.hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

			fs.readdir(`${__dirname}/events/`, (err, files) => {
				if (err) return this.log.error(err)
				files.forEach((file) => {
					const event = require(`${__dirname}/events/${file}`) // eslint-disable-line global-require
					const eventName = file.split('.')[0]
					this.client.on(eventName, event.bind(null, this.client))
				})
			})

			this.client.commands = new Enmap()
			const enabledCommands = []
			fs.readdir(`${__dirname}/commands/`, (err, files) => {
				if (err) return this.log.error(err)
				files.forEach((file) => {
					if (!file.endsWith('.js')) return
					const props = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
					const commandName = file.split('.')[0]
					enabledCommands.push(`${this.config.discord.prefix}${commandName}`)
					this.client.commands.set(commandName, props)
				})


				this.log.log({ level: 'debug', message: `Loading discord commands: (${enabledCommands.join(' ')})`, event: 'discord:commandsAdded' })
			})
			this.client.login(this.config.discord.token[0])
		} catch (err) {
			this.log.error(`Discord commando didn't bounce, \n ${err.message} \n trying again`)
			this.sleep(2000)
			return this.bounceWorker()
		}
	}

	// eslint-disable-next-line class-methods-use-this
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }
}

module.exports = DiscordCommando
