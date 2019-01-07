const log = require('../logger')
const _ = require('lodash')
const config = require('config')
const mysql = require('promise-mysql2')

const db = mysql.createPool(config.db)

const Cache = require('ttl')

const discordcache = new Cache({
	ttl: config.discord.limitsec * 1000,
})
discordcache.on('put', (key, val, ttl) => { })
discordcache.on('hit', (key, val) => { })

const queue = []

const cache = new Cache({
	ttl: 300 * 1000,
})

const MonsterController = require('../controllers/monster')
const RaidController = require('../controllers/raid')
const QuestController = require('../controllers/quest')

const monsterController = new MonsterController(db)
const raidController = new RaidController(db)
const questController = new QuestController(db)

// check how long the queue is every 30s. ideally empty
setInterval(() => {
	if (queue.length > 30) {
		log.warn(`Job queue is ${queue.length} items long`)
	}
}, 30000)


const discord = require('cluster')

discord.setupMaster({ exec: `${__dirname}/../helpers/discord.js` })
_.forEach(config.discord.token, (k) => {
	discord.fork({ k: k })
})


// _.sample(discord.workers).sendMapAttachment('potato')
discord.on('message', (worker, msg) => {
	if (msg.reason === 'seppuku') {
		log.warn('discord worker commited seppuku, cloning new')
		discord.fork({ k: msg.key })
	}
	if (msg.reason === 'hungry') {
		if (queue.length) {
			discord.workers[worker.id].send({ reason: 'food', job: queue.shift() })
		}
	}
})


module.exports = async (req, reply) => {
	let data = req.body
	if (!Array.isArray(data)) data = [data]
	data.forEach((hook) => {
		switch (hook.type) {
			case 'pokemon': {
				if (!cache.get(`${hook.message.encounter_id}_${hook.message.weight}`)) {
					cache.put(`${hook.message.encounter_id}_${hook.message.weight}`, 'cached')
					monsterController.handle(hook.message).then((work) => {
						work.forEach((job) => {
							const ch = _.cloneDeep(discordcache.get(job.target))
							if (ch === undefined) {
								discordcache.put(job.target, 1)
								ch = 1
							}
							let finalMessage = _.cloneDeep(job.message)
							if (ch === config.discord.limitamount + 1 ) {
								discordcache.put(job.target, ch + 1)
								finalMessage = `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`
								job.message = finalMessage
								queue.push(job)
								log.info(`${job.name} reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`)
							}
							if (ch <= config.discord.limitamount) {
								job.message = finalMessage
								discordcache.put(job.target, ch + 1)
								queue.push(job)
								monsterController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
							}
						})
					})
				}
				else {
					log.warn(`Monster encounter:${hook.message.encounter_id} was sent again too soon`)
				}

				reply.send({ webserver: 'happy' })
				break
			}
			case 'raid': {
				if (!cache.get(`${hook.message.gym_id}_${hook.message.pokemon_id}`)) {
					cache.put(`${hook.message.gym_id}_${hook.message.pokemon_id}`, 'cached')
				}
				raidController.handle(hook.message)
					.then((work) => {
						work.forEach((job) => {
							const ch = _.cloneDeep(discordcache.get(job.target))
							if (ch === undefined) {
								discordcache.put(job.target, 1)
								ch = 1
							}
							let finalMessage = _.cloneDeep(job.message)
							if (ch === config.discord.limitamount + 1) {
								discordcache.put(job.target, ch + 1)
								finalMessage = `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`
								job.message = finalMessage
								queue.push(job)
								log.info(`${job.name} reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`)
							}
							if (ch <= config.discord.limitamount) {
								discordcache.put(job.target, ch + 1)
								job.message = finalMessage
								queue.push(job)
								raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
							}
						})
					})

				reply.send({ webserver: 'happy' })
				break
			}
			case 'gym_details': {

				const g = hook.message
				g.park = false
				if (!g.description) g.description = ''
				if (!g.sponsor_id) g.sponsor_id = false
				if (!g.team) g.team = 0
				if (!g.name) g.name = ''
				if (!g.url) g.url = ''
				g.park = g.sponsor_id
				g.name = g.name.replace(/"/g, '')
				g.description = g.description.replace(/"/g, '')
				g.name = g.name.replace(/'/g, '')
				g.description = g.description.replace(/'/g, '')
				g.name = g.name.replace(/\n/g, '')
				g.description = g.description.replace(/\n/g, '')
				monsterController.insertOrUpdateQuery(
					'`gym-info`',
					['id', 'gym_name', 'park', 'description', 'url', 'latitude', 'longitude'],
					[`'${g.id}'`, `'${g.name}'`, `${g.park}`, `'${g.description}'`, `'${g.url}'`, `${g.latitude}`, `${g.longitude}`]
				)
				log.info(`Saved gym-details for ${g.name}`)

				reply.send({ webserver: 'happy' })
				break
			}
			case 'quest': {
				const q = hook.message
				questController.handle(q).then((work) => {
					work.forEach((job) => {
						const ch = _.cloneDeep(discordcache.get(job.target))
						if (ch === undefined) {
							discordcache.put(job.target, 1)
							ch = 1
						}
						let finalMessage = _.cloneDeep(job.message)
						if (ch === config.discord.limitamount + 1) {
							discordcache.put(job.target, ch + 1)
							finalMessage = `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`
							job.message = finalMessage
							queue.push(job)
							log.info(`${job.name} reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`)
						}
						if ( ch <= config.discord.limitamount) {
							discordcache.put(job.target, ch + 1)
							job.message = finalMessage
							queue.push(job)
							raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
						}
					})
				})

				reply.send({ webserver: 'happy' })
				break
			}
			default: {
				log.warn(`Received a weird ${hook.type} webhook, complaining!!`)
			}
		}
	})


	reply.send({
		objecttype: req.body.type,
		datatype: typeof req.body,
		array: Array.isArray(req.body),
		data: data
	})
}
