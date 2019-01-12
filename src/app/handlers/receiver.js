const log = require('../logger')
const _ = require('lodash')
const config = require('config')
const mysql = require('promise-mysql2')
const discord = require('cluster')

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

discord.setupMaster({ exec: `${__dirname}/../helpers/discord.js` })
_.forEach(config.discord.token, (k) => {
	discord.fork({ k: k })
})


discord.on('message', (worker, msg) => {
	if(msg.reason === 'seppuku'){
		log.info(`Discord worker #${worker.id} died, cloning new with key:${msg.key.substr(0, 10)}...`)
		discord.fork({ k: msg.key })
	}
	else if(msg.reason === 'hungry'){
		if (Math.random() >= 0.999) log.debug(`Discord worker #${worker.id} requested food`)
		if (queue.length) {
			worker.send({
				reason: 'food',
				job: queue.shift()
			})
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
							queue.push(job)
							monsterController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
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
							queue.push(job)
							raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
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
						queue.push(job)
						raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
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
