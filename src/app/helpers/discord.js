const Discord = require('discord.js')

const client = new Discord.Client()
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
	log.info(`Discord botto "${client.user.tag}" ready for action!`)
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
			else {
				hungryInterval = startBeingHungry()
				log.warn(`Tried to send message to ${msg.job.name} ID ${msg.job.target}, but error ocurred`)
			}
		}
	})
})


client.on('rateLimitInfo', (rateLimit) => {
	log.warn(`Discord ${client.user.tag} rate limit info: ${rateLimit}`)
})

client.on('warn', (warning) => {
	log.warn(`Discord ${client.user.tag} sent general warning: ${warning}`)
})

process.on('disconnect', (exit) => {
	process.send({ reason: 'seppuku', key: process.env.k })
	process.exit()
})
client.on('error', (e) => {
	process.send({ reason: 'seppuku', key: process.env.k })
	log.info('Discord worker sent me an errot, commiting seppuku just in case')
	process.exit()
})

client.login(process.env.k)
	.catch((err) => {
		log.error(err.message)
		process.send({ reason: 'seppuku', key: process.env.k })
		process.exit()
	})

