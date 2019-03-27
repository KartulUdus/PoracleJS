const cluster = require('cluster')
const Telegraf = require('telegraf')
const commandParts = require('./telegram/middleware/commandParser')
const telegramController = require('./telegram/middleware/controller')
const config = require('config')

const log = require('../logger')

function startBeingHungry() {
	log.log({ level: 'debug', message: `telegram worker #${cluster.worker.id} started being hungry`, event: 'telegram:workRequest' })
	const hungryInterval = setInterval(() => {
		process.send({ reason: 'hungaria' })
	}, 300)
	return hungryInterval
}

const client = new Telegraf(process.env.teleK, { channelMode: true })
client
	.use(commandParts())
	.use(telegramController())

client.launch()

let hungryInterval = startBeingHungry()
process.on('message', (msg) => {
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
		if (config.telegram.images) {
			client.telegram.sendSticker(msg.job.target, msg.job.sticker, { disable_notification: true }).catch((err) => {
				client.log.error(`Failed sending Telegram sticker to ${msg.job.name}. Error: ${err.message}`)
			})
		}
		client.telegram.sendMessage(msg.job.target, message, { parse_mode: 'Markdown', disable_web_page_preview: true }).then(() => {
			if (config.telegram.location) {
				client.telegram.sendLocation(msg.job.target, msg.job.lat, msg.job.lon, { disable_notification: true }).catch((err) => {
					client.log.error(`Failed sending Telegram Location to ${msg.job.name}. Error: ${err.message}`)
				})
			}
		}).catch((err) => {
			client.log.error(`Failed sending Telegram mmessage to ${msg.job.name}. Error: ${err.message}`)
		})
		hungryInterval = startBeingHungry()
	}

})

process.on('exit', () => {
	process.send({
		reason: 'sudoku',
		key: process.env.teleK,
	})
})

