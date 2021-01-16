require('./lib/configFileCreator')()
require('dotenv').config()

const fs = require('fs')
const util = require('util')
const S2 = require('s2-geometry').S2

const NodeCache = require('node-cache')
const fastify = require('fastify')({
	bodyLimit: 5242880,
})
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

const cache = new NodeCache({ stdTTL: 5400, useClones: false })

const discordCache = new NodeCache({ stdTTL: config.discord.limitSec })

const path = require('path')
const pcache = require('flat-cache')
const weatherCache = pcache.load('.weatherCache', path.resolve(`${__dirname}../../`))
const weatherCacheData = weatherCache.getKey('weatherCacheData')

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

const weatherController = new WeatherController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, null, weatherCacheData)
const monsterController = new MonsterController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController, null)
const raidController = new RaidController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController, null)
const questController = new QuestController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController, null)
const pokestopController = new PokestopController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache, weatherController, null)

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
let roleWorker
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

if (config.discord.enabled && config.discord.checkRole && config.discord.checkRoleInterval && config.discord.guild != '') {
	roleWorker = new DiscordWorker(config.discord.token[0], 999, config)
}

async function syncRole() {
	try {
		log.info('Verification of Poracle user\'s roles starting...')
		let usersToCheck = await fastify.monsterController.selectAllQuery('humans', { type: 'discord:user' })
		let invalidUsers = []
		for (const guild of config.discord.guilds) {
			invalidUsers = await roleWorker.checkRole(guild, usersToCheck, config.discord.userRole)
			usersToCheck = invalidUsers
		}
		if (invalidUsers[0]) {
			log.info('Invalid users found, removing from dB...')
			invalidUsers.forEach(async (user) => {
				log.info(`Removing ${user.name} - ${user.id} from Poracle dB`)
				await fastify.monsterController.deleteQuery('egg', { id: user.id })
				await fastify.monsterController.deleteQuery('monsters', { id: user.id })
				await fastify.monsterController.deleteQuery('raid', { id: user.id })
				await fastify.monsterController.deleteQuery('quest', { id: user.id })
				await fastify.monsterController.deleteQuery('humans', { id: user.id })
			})
		} else {
			log.info('No invalid users found, all good!')
		}
	} catch (err) {
		log.error(`Verification of Poracle user's roles failed with, ${err.message}`)
	}
	setTimeout(syncRole, config.discord.checkRoleInterval * 3600000)
}

async function run() {

	if (config.discord.enabled) {
		setInterval(() => {
			if (!fastify.discordQueue.length) {
				return
			}
			if ((Math.random() * 100) > 80) fastify.logger.debug(`DiscordQueue is currently ${fastify.discordQueue.length}`)

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

	if (config.discord.enabled && config.discord.checkRole && config.discord.checkRoleInterval && config.discord.guild != '') {
		setTimeout(syncRole, 10000)
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
		if ((Math.random() * 100) > 80) fastify.logger.debug(`WebhookQueue is currently ${fastify.hookQueue.length}`)

		const hook = fastify.hookQueue.shift()
		switch (hook.type) {
			case 'pokemon': {
				if (config.general.disablePokemon) break
				fastify.webhooks.info('pokemon', hook.message)
				if (fastify.cache.has(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.cp}`)) {
					fastify.logger.debug(`Wild encounter ${hook.message.encounter_id} was sent again too soon, ignoring`)
					break
				}

				fastify.cache.set(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.cp}`, 'cached')

				const result = await fastify.monsterController.handle(hook.message)
				result.forEach((job) => {
					if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
					if (['telegram:user', 'telegram:channel'].includes(job.type)) fastify.telegramQueue.push(job)
				})

				break
			}
			case 'raid': {
				if (config.general.disableRaid) break
				fastify.webhooks.info('raid', hook.message)
				if (fastify.cache.has(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`)) {
					fastify.logger.debug(`Raid ${hook.message.gym_id} was sent again too soon, ignoring`)
					break
				}

				fastify.cache.set(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`, 'cached')

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
				if (config.general.disablePokestop) break
				fastify.webhooks.info('pokestop', hook.message)
				const incidentExpiration = hook.message.incident_expiration ? hook.message.incident_expiration : hook.message.incident_expire_timestamp
				if (!incidentExpiration) break
				if (fastify.cache.has(`${hook.message.pokestop_id}_${incidentExpiration}`)) {
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
				if (config.general.disableQuest) break
				fastify.webhooks.info('quest', hook.message)
				if (fastify.cache.has(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`)) {
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
				if (config.general.disableWeather) break
				fastify.webhooks.info('weather', hook.message)
				if (hook.message.updated) {
					const weatherCellKey = S2.latLngToKey(hook.message.latitude, hook.message.longitude, 10)
					hook.message.s2_cell_id = S2.keyToId(weatherCellKey)
				}
				const updateTimestamp = hook.message.time_changed || hook.message.updated
				const hookHourTimestamp = updateTimestamp - (updateTimestamp % 3600)
				if (fastify.cache.has(`${hook.message.s2_cell_id}_${hookHourTimestamp}`)) {
					fastify.logger.debug(`Weather for ${hook.message.s2_cell_id} was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(`${hook.message.s2_cell_id}_${hookHourTimestamp}`, 'cached')
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
