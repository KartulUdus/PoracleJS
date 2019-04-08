const cluster = require('cluster')
const Telegraf = require('telegraf')
const commandParts = require('./telegram/middleware/commandParser')
const telegramController = require('./telegram/middleware/controller')
const fs = require('fs')
const config = require('config')
const _ = require('lodash')

const log = require('../logger')

function startBeingHungry() {
	log.log({ level: 'debug', message: `telegram worker #${cluster.worker.id} started being hungry`, event: 'telegram:workRequest' })
	const hungryInterval = setInterval(() => {
		process.send({ reason: 'hungary' })
	}, 100)
	return hungryInterval
}

const enabledCommands = []
const clients = []
config.telegram.token.forEach((key) => {
	clients.push(new Telegraf(key, { channelMode: true }))
})
const commandWorker = clients[0]

fs.readdir(`${__dirname}/telegram/commands/`, (err, files) => {
	if (err) return log.error(err)
	clients.forEach((client) => {
		client
			.use(commandParts())
			.use(telegramController())
	})
	files.forEach((file) => {

		if (!file.endsWith('.js')) return
		const props = require(`${__dirname}/telegram/commands/${file}`) // eslint-disable-line global-require
		let commandName = file.split('.')[0]
		if (config.commands[commandName]) commandName = config.commands[commandName]
		enabledCommands.push(commandName)
		commandWorker.command(commandName, props)
	})
	log.log({ level: 'debug', message: `Loading Telegram commands: (${enabledCommands.join(' ')})`, event: 'telegram:commandsAdded' })

	clients.forEach((client) => {
		client.launch()
	})

})

let hungryInterval = startBeingHungry()
process.on('message', (msg) => {
	const client = _.sample(clients)
	if (msg.reason === 'food') {
		clearInterval(hungryInterval)
		let message = ''
		const discordMessage = msg.job.message
		if (discordMessage.content) message = message.concat(`${discordMessage.content}\n`)
		if (discordMessage.embed) {
			if (discordMessage.embed.author) {
				if (discordMessage.embed.author.name) message = message.concat(`\n${discordMessage.embed.author.name}\n`)
			}
			if (discordMessage.embed.title) message = message.concat(`${discordMessage.embed.title}\n`)
			if (discordMessage.embed.description) message = message.concat(`${discordMessage.embed.description}\n`)
			if (discordMessage.embed.fields) {
				discordMessage.embed.fields.forEach((field) => {
					message = message.concat(`\n${field.name}\n\n${field.value}\n`)
					return message
				})
			}
		}
		const msgPromises = []
		if (config.telegram.images) {
			msgPromises.push(client.telegram.sendSticker(msg.job.target, msg.job.sticker, { disable_notification: true }))
		}
		Promise.all([
			msgPromises,
		]).then(() => {
			client.telegram.sendMessage(msg.job.target, message, { parse_mode: 'Markdown', disable_web_page_preview: true }).then(() => {
				if (config.telegram.location) {
					client.telegram.sendLocation(msg.job.target, msg.job.lat, msg.job.lon, { disable_notification: true }).catch((err) => {
						log.error(`Failed sending Telegram Location to ${msg.job.name}. Error: ${err.message}`)
					})
				}
			}).catch((err) => {
				log.error(`Failed sending Telegram message to ${msg.job.name}. Error: ${err.message}`)
			})
		}).catch((err) => {
			log.error(`Failed sending Telegram sticker to ${msg.job.name}. Error: ${err.message}`)
		})


		hungryInterval = startBeingHungry()
	}

})

