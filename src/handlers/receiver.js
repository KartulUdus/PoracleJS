const _ = require('lodash')
const config = require('config')
const mysql = require('mysql2/promise')
const discord = require('cluster')
const telegram = require('cluster')
const uuid = require('uuid/v4')

const db = mysql.createPool(config.db)
const Cache = require('ttl')
const log = require('../logger')

const discordcache = new Cache({
	ttl: config.discord.limitsec * 1000,
})
discordcache.on('put', (key, val, ttl) => { })
discordcache.on('hit', (key, val) => { })

const discordQueue = []
const telegramQueue = []

const cache = new Cache({
	ttl: 360 * 60 * 1000, // 6 hours
})

const MonsterController = require('../controllers/monster')
const RaidController = require('../controllers/raid')
const InvasionController = require('../controllers/invasion')
const QuestController = require('../controllers/quest')

const monsterController = new MonsterController(db)
const raidController = new RaidController(db)
const questController = new QuestController(db)
const invasionController = new InvasionController(db)

// check how long the Queue is every minute. ideally empty
setInterval(() => {
	log.log({
		level: 'debug', message: `Job queue is ${discordQueue.length + telegramQueue.length} items long (D${discordQueue.length}T${telegramQueue.length})`, Queue: telegramQueue.length + discordQueue.length, event: 'queue',
	})
}, 60000)
if (config.discord.enabled) {
	discord.setupMaster({ exec: `${__dirname}/../helpers/discord.js` })
	_.forEach(config.discord.token, (discoK) => {
		discord.fork({ discoK })
	})


	discord.on('message', (worker, msg) => {
		if (msg.reason === 'seppuku') {
			log.log({ level: 'warn', message: `Discord worker #${worker.id} died, cloning new with key:${msg.key.substr(0, 10)}...` })
			discord.fork({ discoK: msg.key })
		}
		else if (msg.reason === 'hungry') {
			if (discordQueue.length) {
				worker.send({
					reason: 'food',
					job: discordQueue.shift(),
				})
			}
		}
	})
}

if (config.telegram.enabled) {
	const tlgk = config.telegram.token
	tlgk.shift()
	telegram.setupMaster({ exec: `${__dirname}/../helpers/telegram.js` })
	telegram.fork()

	telegram.on('exit', () => {
		telegram.fork()
	})

	telegram.on('message', (worker, msg) => {
		if (msg.reason === 'hungary') {
			if (telegramQueue.length) {
				worker.send({
					reason: 'food',
					job: telegramQueue.shift(),
				})
			}
		}
	})
}


function handlePokestopMessage(hook, correlationId) {
	// Get a feeler for RDM/MAD differences
	const incidentExpiration = hook.message.incident_expiration ? hook.message.incident_expiration : hook.message.incident_expire_timestamp

	if (incidentExpiration) {
		if (!cache.get(`${hook.message.pokestop_id}_${incidentExpiration}`)) {
			cache.put(`${hook.message.pokestop_id}_${incidentExpiration}`, 'cached')
			if (incidentExpiration > 0) {
				invasionController.handle(hook.message)
					.then((work) => {
						work.forEach((job) => {
							if (job.target.toString().length > 15 && config.discord.enabled) discordQueue.push(job)
							if (job.target.toString().length < 15 && config.telegram.enabled) telegramQueue.push(job)
							invasionController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
						})
					})
					.catch((e) => {
						log.log({ level: 'error', message: `invasionController failed to handle ${correlationId} \n${e.message} `, event: 'fail:invasionController' })
					})
			}
		}
		else {
			log.log({ level: 'warn', message: `Pokestop Invasion message :${hook.message.pokestop_id} was sent again too soon`, event: 'cache:duplicate' })
		}
	}

	// LURE handling goes here
}

module.exports = async (req, reply) => {
	if (config.general.ipWhitelist.length && !_.includes(config.general.ipWhitelist, req.raw.ip)) {
		log.warn(`Rejecting request from ${req.raw.ip} as it is not in the whitelist`)
		reply.send({ webserver: 'happy' })
		return

	}
	if (config.general.ipBlacklist.length && _.includes(config.general.ipBlacklist, req.raw.ip)) {
		log.warn(`Rejecting request from ${req.raw.ip} as it is in the Blacklist`)
		reply.send({ webserver: 'happy' })
		return
	}
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
							if (job.target.toString().length > 15 && config.discord.enabled) discordQueue.push(job)
							if (job.target.toString().length < 15 && config.telegram.enabled) telegramQueue.push(job)
							monsterController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
						})
						log.log({
							level: 'debug', message: `webhook message ${hook.message.messageId} processed`, messageId: hook.message.messageId, correlationId: hook.message.correlationId, event: 'message:end',
						})
					})
				}
				else {
					log.log({ level: 'info', message: `Monster encounter:${hook.message.encounter_id} was sent again too soon`, event: 'cache:duplicate' })
				}

				break
			}
			case 'raid': {
				if (!cache.get(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`)) {
					cache.put(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`, 'cached')

					raidController.handle(hook.message)
						.then((work) => {
							work.forEach((job) => {
								if (job.target.toString().length > 15 && config.discord.enabled) discordQueue.push(job)
								if (job.target.toString().length < 15 && config.telegram.enabled) telegramQueue.push(job)
								raidController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
							})
						})
						.catch((e) => {
							log.log({ level: 'error', message: `raidController failed to handle ${correlationId} \n${e.message} `, event: 'fail:raidController' })
						})
				}
				else {
					log.log({ level: 'info', message: `Raid at gym :${hook.message.gym_id} was sent again too soon`, event: 'cache:duplicate' })
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
				if (!cache.get(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards.toString())}`)) {
					cache.put(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards.toString())}`, 'cached')
					const q = hook.message
					questController.handle(q).then((work) => {
						work.forEach((job) => {
							if (job.target.toString().length > 15 && config.discord.enabled) discordQueue.push(job)
							if (job.target.toString().length < 15 && config.telegram.enabled) telegramQueue.push(job)
							questController.addOneQuery('humans', 'alerts_sent', 'id', job.target)
						})
					})
				}
				else {
					log.log({ level: 'info', message: `Quest at pokestop:${hook.message.pokestop_id} was sent again too soon`, event: 'cache:duplicate' })
				}
				break

			}
			case 'pokestop': {
				handlePokestopMessage(hook, correlationId)
				break
			}
			case 'invasion': {
				handlePokestopMessage(hook, correlationId)
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
