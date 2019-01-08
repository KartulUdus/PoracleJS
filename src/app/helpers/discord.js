const { Client } = require('discord.js')

const client = new Client()
const config = require('config')
const log = require('../logger')

function startBeingHungry() {
	log.debug(`Discord worker ${process.pid} started being hungry`)
	const hungryInterval = setInterval(() => {
		process.send({ reason: 'hungry' })
	}, 100)
	return hungryInterval
}


client.on('ready', () => {
	log.info(`Discord worker "${client.user.tag}" ready for action!`)
	client.user.setStatus('invisible')
	let hungryInterval = startBeingHungry()
	process.on('message', (msg) => {
		if (msg.reason === 'food') {
			clearInterval(hungryInterval)
			if (client.channels.keyArray().includes(msg.job.target)) {
				client.channels.get(msg.job.target).send(msg.job.message).then((message) => {
					if (config.discord.typereact) {
						msg.job.emoji.forEach((emoji) => {
							message.react(emoji)
						})
					}
					hungryInterval = startBeingHungry()
				})
			}
			else if (client.users.keyArray().includes(msg.job.target)) {
				client.users.get(msg.job.target).send(msg.job.message).then((message) => {
					if (config.discord.typereact) {
						msg.job.emoji.forEach((emoji) => {
							message.react(emoji)
						})
					}
					hungryInterval = startBeingHungry()
				})
			}
			else log.warn(`Tried to send message to ${msg.job.name} ID ${msg.job.target}, but error ocurred`)
		}
	})
})


client.on('rateLimitInfo', (rateLimit) => {
	log.warn(`Discord ${client.user.tag} rate limit info: ${rateLimit}`)
})

client.on('warn', (warning) => {
	log.warn(`Discord ${client.user.tag} sent general warning: ${warning}`)
})

client.on('error', (e) => {
	log.info(`Discord worker sent me an error, commiting seppuku just in case ${e}`)
	process.disconnect()
})

process.on('message', (msg) => {
	if (msg.reason === 'identity') {
		client.login(msg.key)
			.catch((err) => {
				log.error(`Discord worker not signed in: ${err.message}`)
				process.disconnect()
			})
	}
})