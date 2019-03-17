const log = require('../logger')
const _ = require('lodash')
const config = require('config')
const mysql = require('mysql2/promise')
const discord = require('cluster')
const uuid = require('uuid/v4')

const db = mysql.createPool(config.db)
const Cache = require('ttl')

const discordcache = new Cache({
	ttl: config.discord.limitsec * 1000,
})
discordcache.on('put', (key, val, ttl) => { })
discordcache.on('hit', (key, val) => { })

const queue = []

const cache = new Cache({
	ttl: 61 * 60 * 1000,
})

const MonsterController = require('../controllers/monster')
const RaidController = require('../controllers/raid')
const QuestController = require('../controllers/quest')

const monsterController = new MonsterController(db)
const raidController = new RaidController(db)
const questController = new QuestController(db)

// check how long the queue is every minute. ideally empty
setInterval(() => {
	log.log({
		level: 'debug', message: `Job queue is ${queue.length} items long`, queue: queue.length, event: 'queue',
	})
}, 60000)

discord.setupMaster({ exec: `${__dirname}/../helpers/discord.js` })
_.forEach(config.discord.token, (k) => {
	discord.fork({ k })
})


discord.on('message', (worker, msg) => {
	if (msg.reason === 'seppuku') {
		log.log({ level: 'warn', message: `Discord worker #${worker.id} died, cloning new with key:${msg.key.substr(0, 10)}...` })
		discord.fork({ k: msg.key })
	}
	else if (msg.reason === 'hungry') {
		if (queue.length) {
			worker.send({
				reason: 'food',
				job: queue.shift(),
			})
		}
	}
})

module.exports = async (req, reply) => {
	let data = req.body
	const correlationId = uuid()
	if (!Array.isArray(data)) data = [data]
	log.log({
		level: 'debug', message: `http request ${correlationId} started`, correlationId, event: 'http:start',
	})

	data.forEach((hook) => {
		hook.message.correlationId = correlationId
		hook.message.messageId = uuid()
		switch (hook.type) {
			case 'pokemon': {
				if (!cache.get(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.weight}`)) {
					cache.put(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.weight}`, 'cached')
					monsterController.handle(hook.message).then((work) => {
						work.forEach((job) => {
							queue.push(job)
							monsterController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
						})
						log.log({
							level: 'debug', message: `webhook message ${hook.message.messageId} processed`, messageId: hook.message.messageId, correlationId: hook.message.correlationId, event: 'message:end',
						})
					})
				}
				else {
					log.log({ level: 'warn', message: `Monster encounter:${hook.message.encounter_id} was sent again too soon`, event: 'cache:duplicate' })
				}

				break
			}
			case 'raid': {
				if (!cache.get(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`)) {
					cache.put(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`, 'cached')

					raidController.handle(hook.message)
						.then((work) => {
							work.forEach((job) => {
								queue.push(job)
								raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
							})
						})
						.catch((e) => {
							log.log({ level: 'error', message: `raidController failed to handle ${correlationId} \n${e.message} `, event: 'fail:raidController' })
						})
				}
				else {
					log.log({ level: 'warn', message: `Raid at gym :${hook.message.gym_id} was sent again too soon`, event: 'cache:duplicate' })
				}
				break
			}
			case 'gym_details': {

				const g = hook.message
				g.park = false
				if (!g.description) g.description = ''
				if (!g.ex_raid_eligible) g.ex_raid_eligible = false
				if (!g.team) g.team = 0
				if (!g.name) g.name = ''
				if (!g.url) g.url = ''
				g.park = g.ex_raid_eligible
				g.name = g.name.replace(/"/g, '')
				g.description = g.description.replace(/"/g, '')
				g.name = g.name.replace(/'/g, '')
				g.description = g.description.replace(/'/g, '')
				g.name = g.name.replace(/\n/g, '')
				g.description = g.description.replace(/\n/g, '')
				monsterController.insertOrUpdateQuery(
					'`gym-info`',
					['id', 'gym_name', 'park', 'description', 'url', 'latitude', 'longitude'],
					[[g.id, g.name, g.park, g.description, g.url, g.latitude, g.longitude]],
				)
				log.info(`Saved gym-details for ${g.name}`)
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
				break
			}
			default:
		}
	})

	if (!reply.sent) {
		log.log({
			level: 'debug',
			message: `http request${correlationId} replied to`,
			event: 'http:end',
		})
		reply.send({ webserver: 'happy' })
	}
}
