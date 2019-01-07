const { Client, Attachment } = require('discord.js')

const client = new Client()
const fs = require('fs')
const Controller = require('../controllers/controller')

const controller = new Controller()
const config = require('config')
const log = require('../logger')
const pcache = require('persistent-cache')

const staticMapCache = pcache({	base: '.cache',	name: 'staticMapCache' })

function startBeingHungry() {
	log.debug(`Discord worker ${process.pid} started being hungry`)
	const hungryInterval = setInterval(() => {
		process.send({ reason: 'hungry' })
	}, 100)
	return hungryInterval
}

function getOsmStaticMapUrl(lat, lon) {
	return new Promise((resolve) => {
		if (config.geocoding.provider.toLowerCase() === 'osm' && config.discord.mapChannel) {
			let osmUrl = ''
			const cacheKey = `${lat}-${lon}`
			staticMapCache.get(cacheKey, (err, mapurl) => {
				if (err) log.error(err)
				if (!mapurl) {
					controller.getOSMStatic(lat, lon)
						.then((tempPath) => {
							const attach = new Attachment(tempPath)
							client.channels.get(config.discord.mapChannel)
								.send(attach)
								.then((message) => {
									fs.unlinkSync(tempPath)
									osmUrl = message.attachments.array()[0].url
									staticMapCache.put(cacheKey, osmUrl, (error, r) => {
										if (error) log.error(`Error static map url for ${cacheKey}: ${error}`)
									})
									resolve(osmUrl)
								})
								.catch((err) => {
									log.error(err.message)
								})
						})
						.catch((err) => {
							log.error(err.message)
						})
				}
				else {
					resolve(mapurl)
				}
			})
		}
		else {
			resolve('')
		}

	})
}

client.on('ready', () => {
	log.info(`Discord botto "${client.user.tag}" ready for action!`)
	client.user.setStatus('invisible')
	let hungryInterval = startBeingHungry()
	process.on('message', (msg) => {
		if (msg.reason === 'food') {
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

