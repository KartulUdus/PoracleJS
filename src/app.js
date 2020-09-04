require('./lib/configFileCreator')()
require('dotenv').config()

const fs = require('fs')
const util = require('util')

const NodeCache = require('node-cache')
const fastify = require('fastify')()
const Telegraf = require('telegraf')

const telegramCommandParser = require('./lib/telegram/middleware/commandParser')
const telegramController = require('./lib/telegram/middleware/controller')

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

const {
	config, knex, dts, geofence, translator,
} = Config()

const readDir = util.promisify(fs.readdir)

const telegraf = new Telegraf(config.telegram.token, { channelMode: true })


const cache = new NodeCache({ stdTTL: 5400 })

const discordCache = new NodeCache({ stdTTL: config.discord.limitSec })

const DiscordWorker = require('./lib/discord/discordWorker')
const DiscordCommando = require('./lib/discord/commando')

const TelegramWorker = require('./lib/telegram/Telegram')

const { log, webhooks } = require('./lib/logger')
const monsterData = require('./util/monsters')
const utilData = require('./util/util')
const re = require('./util/regex')(translator)


const MonsterController = require('./controllers/monster')
const RaidController = require('./controllers/raid')
const QuestController = require('./controllers/quest')
const PokestopController = require('./controllers/pokestop')
const WeatherController = require('./controllers/weather')

const weatherController = new WeatherController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, null)
const monsterController = new MonsterController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController)
const raidController = new RaidController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController)
const questController = new QuestController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController)
const pokestopController = new PokestopController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController)


fastify.decorate('logger', log)
fastify.decorate('webhooks', webhooks)
fastify.decorate('config', config)
fastify.decorate('knex', knex)
fastify.decorate('cache', cache)
fastify.decorate('monsterController', monsterController)
fastify.decorate('raidController', raidController)
fastify.decorate('questController', questController)
fastify.decorate('pokestopController', pokestopController)
fastify.decorate('weatherController', weatherController)
fastify.decorate('dts', dts)
fastify.decorate('geofence', geofence)
fastify.decorate('translator', translator)
fastify.decorate('discordQueue', [])
fastify.decorate('telegramQueue', [])
fastify.decorate('hookQueue', [])

const discordCommando = config.discord.enabled ? new DiscordCommando(knex, config, log, monsterData, utilData, dts, geofence, translator) : null
log.info(`Discord commando ${discordCommando ? '' : ''}starting`)
const discordWorkers = []
let telegram
let workingOnHooks = false

if (config.discord.enabled) {
	for (const key in config.discord.token) {
		if (config.discord.token[key]) {
			discordWorkers.push(new DiscordWorker(config.discord.token[key], key, config))
		}
	}
}

if (config.telegram.enabled) {
	telegram = new TelegramWorker(config, log, dts, telegramController, monsterController, telegraf, translator, telegramCommandParser, re)
}

// todo remove lint passing log
log.debug(telegram)


async function run() {
	if (config.discord.enabled) {
		setInterval(() => {
			if (!fastify.discordQueue.length) {
				return
			}
			const { target } = fastify.discordQueue[0]
			// see if target has dedicated worker
			let worker = discordWorkers.find((workerr) => workerr.users.includes(target))
			if (!worker) {
				let busyestWorkerHumanCount = Number.POSITIVE_INFINITY
				let laziestWorkerId
				Object.keys(discordWorkers).map((i) => {
					if (discordWorkers[i].userCount < busyestWorkerHumanCount) {
						busyestWorkerHumanCount = discordWorkers[i].userCount
						laziestWorkerId = i
					}
				})
				busyestWorkerHumanCount = Number.POSITIVE_INFINITY
				worker = discordWorkers[laziestWorkerId]
				worker.addUser(target)
			}
			if (!worker.busy) worker.work(fastify.discordQueue.shift())
		}, 10)
	}

	// if (config.telegram.enabled) {
	// 	setInterval(() => {
	// 		if (!fastify.telegramQueue.length) {
	// 			return
	// 		}
	// 		const { target } = fastify.telegramQueue[0]
	// 		// see if target has dedicated worker
	// 		let worker = telegramWorkers.find((workerr) => workerr.users.includes(target))
	// 		if (!worker) {
	// 			let busyestWorkerHumanCount = Number.POSITIVE_INFINITY
	// 			let laziestWorkerId
	// 			Object.keys(discordWorkers).map((i) => {
	// 				if (discordWorkers[i].userCount < busyestWorkerHumanCount) {
	// 					busyestWorkerHumanCount = discordWorkers[i].userCount
	// 					laziestWorkerId = i
	// 				}
	// 			})
	// 			busyestWorkerHumanCount = Number.POSITIVE_INFINITY
	// 			worker = discordWorkers[laziestWorkerId]
	// 			worker.addUser(target)
	// 		}
	// 		if (!worker.busy) worker.work(fastify.discordQueue.shift())
	// 	}, 10)
	// }

	const routeFiles = await readDir(`${__dirname}/routes/`)
	const routes = routeFiles.map((fileName) => `${__dirname}/routes/${fileName}`)

	routes.forEach((route) => fastify.register(require(route)))
	await fastify.listen(config.server.port, config.server.host)
	log.info(`Service started on ${fastify.server.address().address}:${fastify.server.address().port}`)
}

async function handleAlarms() {
	if (fastify.hookQueue.length && !workingOnHooks && fastify.monsterController && fastify.raidController && fastify.questController) {
		if ((Math.random() * 100) > 80) fastify.log.debug(`WebhookQueue is currently ${fastify.hookQueue.length}`)

		const hook = fastify.hookQueue.shift()
		switch (hook.type) {
			case 'pokemon': {
				fastify.webhooks.info('pokemon', hook.message)
				if (fastify.cache.get(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.weight}`)) {
					fastify.logger.debug(`Wild encounter ${hook.message.encounter_id} was sent again too soon, ignoring`)
					break
				}

				fastify.cache.set(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.weight}`, JSON.stringify(hook))

				const result = await fastify.monsterController.handle(hook.message)
				result.forEach((job) => {
					if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
					if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
				})

				break
			}
			case 'raid': {
				fastify.webhooks.info('raid', hook.message)
				if (fastify.cache.get(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`)) {
					fastify.logger.debug(`Raid ${hook.message.gym_id} was sent again too soon, ignoring`)
					break
				}

				fastify.cache.set(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`, JSON.stringify(hook))

				const result = await fastify.raidController.handle(hook.message)
				if (!result) break
				result.forEach((job) => {
					if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
					if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
				})
				break
			}
			case 'invasion':
			case 'pokestop': {
				fastify.webhooks.info('pokestop', hook.message)
				const incidentExpiration = hook.message.incident_expiration ? hook.message.incident_expiration : hook.message.incident_expire_timestamp
				if (!incidentExpiration) break
				if (await fastify.cache.get(`${hook.message.pokestop_id}_${incidentExpiration}`)) {
					fastify.logger.debug(`Invasion at ${hook.message.pokestop_id} was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(`${hook.message.pokestop_id}_${incidentExpiration}`, 'cached')

				const result = await fastify.pokestopController.handle(hook.message)
				if (!result) break

				result.forEach((job) => {
					if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
					if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
				})

				break
			}
			case 'quest': {
				fastify.webhooks.info('quest', hook.message)
				if (await fastify.cache.get(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`)) {
					fastify.logger.debug(`Quest at ${hook.message.pokestop_name} was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`, 'cached')
				const q = hook.message

				const result = await fastify.questController.handle(q)
				if (!result) break

				result.forEach((job) => {
					if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
					if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
				})
				break
			}
			case 'weather': {
				fastify.webhooks.info('weather', hook.message)
				if (await fastify.cache.get(`${hook.message.s2_cell_id}_${hook.message.time_changed}`)) {
					fastify.logger.debug(`Weather for ${hook.message.s2_cell_id} was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(`${hook.message.s2_cell_id}_${hook.message.time_changed}`, 'cached')
				const result = await fastify.weatherController.handle(hook.message)
				result.forEach((job) => {
					if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
					if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
				})
				break
			}
			default:
		}
		workingOnHooks = false
	}
}

run()
setInterval(handleAlarms, 1)
