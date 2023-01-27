const {
	Client,
	Intents,
	Options,
} = require('discord.js')
const { EventEmitter } = require('events')
const fs = require('fs')
const { S2 } = require('s2-geometry')
const mustache = require('handlebars')
const hastebin = require('hastebin-gen')
const { diff } = require('deep-object-diff')

const emojiStrip = require('../../../util/emojiStrip')

class DiscordCommando extends EventEmitter {
	constructor(token, query, scannerQuery, config, logs, GameData, PoracleInfo, dts, geofence, translatorFactory) {
		super()

		this.token = token
		this.config = config
		this.query = query
		this.scannerQuery = scannerQuery
		this.logs = logs
		this.GameData = GameData
		this.PoracleInfo = PoracleInfo
		this.updatedDiff = diff
		this.dts = dts
		this.geofence = geofence
		this.translatorFactory = translatorFactory
		this.translator = translatorFactory.default
		this.re = require('../../../util/regex')(this.translatorFactory)
		this.id = '0'
	}

	async start() {
		await this.bounceWorker()
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
			this.client.on('error', (err) => {
				this.busy = true
				this.logs.log.error(`Discord worker #${this.id} \n bouncing`, err)
				this.bounceWorker()
			})

			this.client.on('rateLimit', (info) => {
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
				this.logs.log.warn(`#${this.id} Discord commando worker - 429 rate limit hit - in timeout ${info.timeout ? info.timeout : 'Unknown timeout '} route ${info.route}${channelId ? ` (probably ${channelId})` : ''}`)
			})
			this.client.on('ready', () => {
				this.logs.log.info(`#${this.id} Discord commando - ${this.client.user.tag} ready for action`)

				this.busy = false
			})

			// We also need to make sure we're attaching the config to the CLIENT so it's accessible everywhere!
			this.client.config = this.config
			this.client.S2 = S2
			this.client.query = this.query
			this.client.scannerQuery = this.scannerQuery
			this.client.emojiStrip = emojiStrip
			this.client.logs = this.logs
			this.client.dts = this.dts
			this.client.re = this.re
			this.client.geofence = this.geofence
			this.client.GameData = this.GameData
			this.client.PoracleInfo = this.PoracleInfo
			this.client.mustache = mustache
			this.client.hastebin = hastebin
			this.client.translatorFactory = this.translatorFactory
			this.client.updatedDiff = diff
			this.client.translator = this.translator
			this.client.hookRegex = /(?:https?:\/\/|www\.)(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$?!:,.])*(?:\([-A-Z0-9+&@#/%=~_|$?!:,.]*\)|[-A-Z0-9+&@#/%=~_|$])/igm
			this.client.on('poracleAddMessageQueue', (queue) => this.emit('sendMessages', queue))
			this.client.on('poracleAddWebhookQueue', (queue) => this.emit('addWebhook', queue))
			this.client.on('poracleReloadAlerts', () => this.emit('refreshAlertCache'))

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

			await this.client.login(this.token)
		} catch (err) {
			if (err.code === 'DISALLOWED_INTENTS') {
				this.logs.log.error('Could not initialise discord', err)
				this.logs.log.error('Ensure that your discord bot Gateway intents for Presence, Server Members and Messages are on - see https://muckelba.github.io/poracleWiki/discordbot.html')
				process.exit(1)
			}

			this.logs.log.error(`Discord commando didn't bounce, \n ${err.message} \n trying again`)
			await this.sleep(2000)
			return this.bounceWorker()
		}
	}

	// eslint-disable-next-line class-methods-use-this,no-promise-executor-return
	async sleep(n) { return new Promise((resolve) => setTimeout(resolve, n)) }
}

module.exports = DiscordCommando
