require('./lib/configFileCreator')()
require('dotenv').config()
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100

const fs = require('fs')
const fsp = require('fs').promises
const util = require('util')
const { S2 } = require('s2-geometry')

const NodeCache = require('node-cache')
const fastify = require('fastify')({
	bodyLimit: 5242880,
})
const Telegraf = require('telegraf')

const path = require('path')
const pcache = require('flat-cache')
const schedule = require('node-schedule')
const telegramCommandParser = require('./lib/telegram/middleware/commandParser')
const telegramController = require('./lib/telegram/middleware/controller')
const TelegramUtil = require('./lib/telegram/telegramUtil.js')

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

const {
	config, knex, dts, geofence, translator, translatorFactory,
} = Config()

const GameData = {
	monsters: require('./util/monsters'),
	utilData: require('./util/util'),
	moves: require('./util/moves'),
	items: require('./util/items'),
	grunts: require('./util/grunts'),
}

const readDir = util.promisify(fs.readdir)

const telegraf = new Telegraf(config.telegram.token, { channelMode: true })
const telegrafChannel = config.telegram.channelToken ? new Telegraf(config.telegram.channelToken, { channelMode: true }) : null

const cache = new NodeCache({ stdTTL: 5400, useClones: false }) // 90 minutes

const discordCache = new NodeCache({ stdTTL: config.discord.limitSec })

const weatherCache = pcache.load('.weatherCache', path.resolve(`${__dirname}../../`))
const weatherCacheData = weatherCache.getKey('weatherCacheData')

const DiscordWorker = require('./lib/discord/discordWorker')
const DiscordCommando = require('./lib/discord/commando')

const TelegramWorker = require('./lib/telegram/Telegram')

const logs = require('./lib/logger')

const { log } = logs
const re = require('./util/regex')(translatorFactory)

const MonsterController = require('./controllers/monster')
const RaidController = require('./controllers/raid')
const QuestController = require('./controllers/quest')
const PokestopController = require('./controllers/pokestop')
const PokestopLureController = require('./controllers/pokestop_lure')
const WeatherController = require('./controllers/weather')

const weatherController = new WeatherController(knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, null, weatherCacheData)
const monsterController = new MonsterController(knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const raidController = new RaidController(knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const questController = new QuestController(knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const pokestopController = new PokestopController(knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const pokestopLureController = new PokestopLureController(knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)

fastify.decorate('logger', logs.log)
fastify.decorate('controllerLog', logs.controller)
fastify.decorate('webhooks', logs.webhooks)
fastify.decorate('config', config)
fastify.decorate('knex', knex)
fastify.decorate('cache', cache)
fastify.decorate('monsterController', monsterController)
fastify.decorate('raidController', raidController)
fastify.decorate('questController', questController)
fastify.decorate('pokestopController', pokestopController)
fastify.decorate('pokestopLureController', pokestopLureController)
fastify.decorate('weatherController', weatherController)
fastify.decorate('dts', dts)
fastify.decorate('geofence', geofence)
fastify.decorate('translator', translator)
fastify.decorate('discordQueue', [])
fastify.decorate('telegramQueue', [])
fastify.decorate('hookQueue', [])

const discordCommando = config.discord.enabled ? new DiscordCommando(knex, config, logs, GameData, dts, geofence, translatorFactory) : null
logs.log.info(`Discord commando ${discordCommando ? '' : ''}starting`)
const discordWorkers = []
let roleWorker
let telegram
let telegramChannel
const workingOnHooks = false

if (config.discord.enabled) {
	for (const key in config.discord.token) {
		if (config.discord.token[key]) {
			discordWorkers.push(new DiscordWorker(config.discord.token[key], key, config, logs, true))
		}
	}

	if (config.discord.checkRole && config.discord.checkRoleInterval && config.discord.guild != '') {
		roleWorker = new DiscordWorker(config.discord.token[0], 999, config, logs)
	}
}

let telegramUtil
if (config.telegram.enabled) {
	telegram = new TelegramWorker('0', config, logs, GameData, dts, geofence, telegramController, monsterController, telegraf, translatorFactory, telegramCommandParser, re, true)

	if (telegrafChannel) {
		telegramChannel = new TelegramWorker('1', config, logs, GameData, dts, geofence, telegramController, monsterController, telegrafChannel, translatorFactory, telegramCommandParser, re, true)
	}

	if (config.telegram.checkRole && config.telegram.checkRoleInterval) {
		telegramUtil = new TelegramUtil(config, log, telegraf)
	}
}

async function removeInvalidUser(user) {
	await fastify.monsterController.deleteQuery('egg', { id: user.id })
	await fastify.monsterController.deleteQuery('monsters', { id: user.id })
	await fastify.monsterController.deleteQuery('raid', { id: user.id })
	await fastify.monsterController.deleteQuery('quest', { id: user.id })
	await fastify.monsterController.deleteQuery('humans', { id: user.id })
}

async function syncTelegramMembership() {
	try {
		log.verbose('Verification of Telegram group membership for Poracle users starting...')

		let usersToCheck = await fastify.monsterController.selectAllQuery('humans', { type: 'telegram:user' })
		usersToCheck = usersToCheck.filter((user) => !config.telegram.admins.includes(user.id))
		let invalidUsers = []
		for (const channel of config.telegram.channels) {
			invalidUsers = await telegramUtil.checkMembership(usersToCheck, channel)
			usersToCheck = invalidUsers
		}

		if (invalidUsers[0]) {
			log.info('Invalid users found, removing from dB...')
			for (const user of invalidUsers) {
				log.info(`Removing ${user.name} - ${user.id} from Poracle dB`)
				if (config.general.roleCheckDeletionsAllowed) {
					await removeInvalidUser(user)
				} else {
					log.info('config.general.roleCheckDeletionAllowed not set, not removing')
				}
			}
		} else {
			log.verbose('No invalid users found, all good!')
		}
	} catch (err) {
		log.error('Verification of Poracle user\'s roles failed with', err)
	}
	setTimeout(syncTelegramMembership, config.telegram.checkRoleInterval * 3600000)
}

async function syncDiscordRole() {
	try {
		log.verbose('Verification of Discord role membership to Poracle users starting...')
		let usersToCheck = await fastify.monsterController.selectAllQuery('humans', { type: 'discord:user' })
		usersToCheck = usersToCheck.filter((user) => !config.discord.admins.includes(user.id))
		let invalidUsers = []
		for (const guild of config.discord.guilds) {
			invalidUsers = await roleWorker.checkRole(guild, usersToCheck, config.discord.userRole)
			usersToCheck = invalidUsers
		}
		if (invalidUsers[0]) {
			log.info('Invalid users found, removing from dB...')
			for (const user of invalidUsers) {
				log.info(`Removing ${user.name} - ${user.id} from Poracle dB`)
				if (config.general.roleCheckDeletionsAllowed) {
					await removeInvalidUser(user)
				} else {
					log.info('config.general.roleCheckDeletionAllowed not set, not removing')
				}
			}
		} else {
			log.verbose('No invalid users found, all good!')
		}
	} catch (err) {
		log.error('Verification of Poracle user\'s roles failed with', err)
	}
	setTimeout(syncDiscordRole, config.discord.checkRoleInterval * 3600000)
}

async function saveEventCache() {
	// eslint-disable-next-line no-underscore-dangle
	fastify.cache._checkData(false)
	return fsp.writeFile('.cache/webhook-events.json', JSON.stringify(fastify.cache.data), 'utf8')
}

async function loadEventCache() {
	let loaddatatxt

	try {
		loaddatatxt = await fsp.readFile('.cache/webhook-events.json', 'utf8')
	} catch {
		return
	}

	const now = Date.now()

	try {
		const data = JSON.parse(loaddatatxt)
		for (const key of Object.keys(data)) {
			const msgData = data[key]

			if (msgData.t > now) {
				const newTtlms = Math.max(msgData.t - now, 2000)
				const newTtl = Math.floor(newTtlms / 1000)
				fastify.cache.set(key, msgData.v, newTtl)
			}
		}
	} catch (err) {
		this.log.info(`Error processing historic cache ${err}`)
	}
}

function handleShutdown() {
	const workerSaves = []
	for (const worker of discordWorkers) {
		workerSaves.push(worker.saveTimeouts())
	}
	if (telegram) workerSaves.push(telegram.saveTimeouts())
	if (telegramChannel) workerSaves.push(telegramChannel.saveTimeouts())
	if (config.general.persistDuplicateCache) {
		workerSaves.push(saveEventCache())
	}

	Promise.all(workerSaves)
		.then(() => {
			process.exit()
		}).catch((err) => {
			log.error(`Error saving files ${err}`)
			process.exit()
		})
}

process.on('SIGINT', handleShutdown)
process.on('SIGTERM', handleShutdown)

const discordBigQueue = { count: 0, lastSize: 0 }

async function run() {
	if (config.general.persistDuplicateCache) {
		await loadEventCache()
	}

	if (config.discord.enabled) {
		setInterval(() => {
			if (!fastify.discordQueue.length) {
				return
			}
			if ((Math.random() * 100) > 80) fastify.logger.debug(`DiscordQueue is currently ${fastify.discordQueue.length}`)

			if (fastify.discordQueue.length > 500) {
				discordBigQueue.count++
				discordBigQueue.lastSize = fastify.discordQueue.length
				if ((discordBigQueue.count % 6000) == 0) { // Approx once per minute 10ms per call
					fastify.logger.warn(`DiscordQueue is big, remained big for ${discordBigQueue.count} calls currently ${discordBigQueue.lastSize}`)
				}
			} else {
				discordBigQueue.lastSize = 0
				discordBigQueue.count = 0
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

		if (config.discord.checkRole && config.discord.checkRoleInterval && config.discord.guild != '') {
			setTimeout(syncDiscordRole, 10000)
		}
	}

	if (config.telegram.enabled) {
		setInterval(() => {
			if (!fastify.telegramQueue.length) {
				return
			}
			if ((Math.random() * 100) > 80) fastify.logger.debug(`TelegramQueue is currently ${fastify.telegramQueue.length}`)

			let worker = telegram
			if (telegramChannel && ['telegram:channel', 'telegram:group'].includes(fastify.telegramQueue[0].type)) {
				worker = telegramChannel
			}
			// const { target } = fastify.telegramQueue[0]
			// // see if target has dedicated worker
			// let worker = telegramWorkers.find((workerr) => workerr.users.includes(target))
			// if (!worker) {
			// 	let busyestWorkerHumanCount = Number.POSITIVE_INFINITY
			// 	let laziestWorkerId
			// 	Object.keys(telegramWorkers).map((i) => {
			// 		if (telegramWorkers[i].userCount < busyestWorkerHumanCount) {
			// 			busyestWorkerHumanCount = telegramWorkers[i].userCount
			// 			laziestWorkerId = i
			// 		}
			// 	})
			// 	busyestWorkerHumanCount = Number.POSITIVE_INFINITY
			// 	worker = telegramWorkers[laziestWorkerId]
			// 	worker.addUser(target)
			// }
			if (!worker.busy) worker.work(fastify.telegramQueue.shift())
		}, 10)

		if (config.telegram.checkRole && config.telegram.checkRoleInterval) {
			setTimeout(syncTelegramMembership, 30000)
		}
	}

	const routeFiles = await readDir(`${__dirname}/routes/`)
	const routes = routeFiles.map((fileName) => `${__dirname}/routes/${fileName}`)

	routes.forEach((route) => fastify.register(require(route)))
	await fastify.listen(config.server.port, config.server.host)
	log.info(`Service started on ${fastify.server.address().address}:${fastify.server.address().port}`)
}

const PromiseQueue = require('./lib/PromiseQueue')

const alarmProcessor = new PromiseQueue(fastify.hookQueue, 10)

async function processOne(hook) {
	try {
		switch (hook.type) {
			case 'pokemon': {
				if (config.general.disablePokemon) {
					fastify.controllerLog.debug(`${hook.message.encounter_id}: Wild encounter was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info('pokemon', hook.message)
				if (fastify.cache.has(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.cp}`)) {
					fastify.controllerLog.debug(`${hook.message.encounter_id}: Wild encounter was sent again too soon, ignoring`)
					break
				}

				// Set cache expiry to calculated pokemon expiry + 5 minutes to cope with near misses
				const secondsRemaining = Math.max((hook.message.disappear_time * 1000 - Date.now()) / 1000, 0) + 300

				fastify.cache.set(`${hook.message.encounter_id}_${hook.message.disappear_time}_${hook.message.cp}`, 'cached', secondsRemaining)

				const result = await fastify.monsterController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) fastify.telegramQueue.push(job)
					})
				} else {
					fastify.controllerLog.error(`Missing result from ${hook.type} processor`, hook.message)
				}

				break
			}
			case 'raid': {
				if (config.general.disableRaid) {
					fastify.controllerLog.debug(`${hook.message.gym_id}: Raid was received but set to be ignored in config`)

					break
				}
				fastify.webhooks.info('raid', hook.message)
				if (fastify.cache.has(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`)) {
					fastify.controllerLog.debug(`${hook.message.gym_id}: Raid was sent again too soon, ignoring`)
					break
				}

				fastify.cache.set(`${hook.message.gym_id}_${hook.message.end}_${hook.message.pokemon_id}`, 'cached')

				const result = await fastify.raidController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) fastify.telegramQueue.push(job)
					})
				} else {
					fastify.controllerLog.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			//			case 'invasion':
			case 'pokestop': {
				if (config.general.disablePokestop) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Pokestop was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info('pokestop', hook.message)
				const incidentExpiration = hook.message.incident_expiration ? hook.message.incident_expiration : hook.message.incident_expire_timestamp
				const lureExpiration = hook.message.lure_expiration
				if (!lureExpiration && !incidentExpiration) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Pokestop received but no invasion or lure information, ignoring`)
					break
				}
				let result = 0
				if (lureExpiration) {
					if (fastify.cache.has(`${hook.message.pokestop_id}_L${lureExpiration}`)) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Lure was sent again too soon, ignoring`)
						break
					}

					// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
					const secondsRemaining = Math.max((lureExpiration * 1000 - Date.now()) / 1000, 0) + 300

					fastify.cache.set(`${hook.message.pokestop_id}_L${lureExpiration}`, 'cached', secondsRemaining)

					result = await fastify.pokestopLureController.handle(hook.message)
				} else {
					if (fastify.cache.has(`${hook.message.pokestop_id}_${incidentExpiration}`)) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Invasion was sent again too soon, ignoring`)
						break
					}

					// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
					const secondsRemaining = Math.max((incidentExpiration * 1000 - Date.now()) / 1000, 0) + 300

					fastify.cache.set(`${hook.message.pokestop_id}_${incidentExpiration}`, 'cached', secondsRemaining)

					result = await fastify.pokestopController.handle(hook.message)
				}
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) fastify.telegramQueue.push(job)
					})
				} else {
					fastify.controllerLog.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			case 'quest': {
				if (config.general.disableQuest) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Quest was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info('quest', hook.message)
				if (fastify.cache.has(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`)) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Quest was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(`${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`, 'cached')
				const q = hook.message

				const result = await fastify.questController.handle(q)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) fastify.telegramQueue.push(job)
					})
				} else {
					fastify.controllerLog.error(`Missing result from ${hook.type} processor`, hook.message)
				}
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
					fastify.controllerLog.debug(`${hook.message.s2_cell_id}: Weather for this cell was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(`${hook.message.s2_cell_id}_${hookHourTimestamp}`, 'cached')
				const result = await fastify.weatherController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) fastify.telegramQueue.push(job)
					})
				} else {
					fastify.controllerLog.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			default:
		}
	} catch (err) {
		fastify.controllerLog.error('Hook processor error (something wasn\'t caught higher)', err)
	}
}

const bigQueue = { count: 0, lastSize: 0 }

async function handleAlarms() {
	if (fastify.hookQueue.length && !workingOnHooks && fastify.monsterController && fastify.raidController && fastify.questController) {
		if ((Math.random() * 100) > 80) fastify.logger.info(`WebhookQueue is currently ${fastify.hookQueue.length}`)

		if (fastify.hookQueue.length > 5000) {
			bigQueue.count++
			bigQueue.lastSize = fastify.hookQueue.length
			if ((bigQueue.count % 600) == 0) { // Approx once a minute warning with 100ms interval
				fastify.logger.warn(`WebhookQueue is big, remained big for ${bigQueue.count} calls currently ${bigQueue.lastSize}`)
			}
		} else {
			bigQueue.lastSize = 0
			bigQueue.count = 0
		}

		alarmProcessor.run(processOne)
	}
}

const NODE_MAJOR_VERSION = process.versions.node.split('.')[0]
if (NODE_MAJOR_VERSION < 12) {
	throw new Error('Requires Node 12 (or higher)')
}
// 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55
schedule.scheduleJob({ minute: [0] }, async () => {
	const now = new Date()
	const dow = now.getDay()
	const hour = now.getHours()
	// sunday = 0

	log.info('Profile Check: Checking for active profile changes')
	const profilesToCheck = await fastify.monsterController.misteryQuery('SELECT * FROM profiles WHERE LENGTH(active_hours)>5 ORDER BY id, profile_no')

	let lastId
	for (const profile of profilesToCheck) {
		if (profile.id != lastId) {
			const timings = JSON.parse(profile.active_hours)
			const active = timings.some((row) => row.day == dow && row.start <= hour && hour < row.end)
			if (active) {
				log.info(`Profile Check: Setting ${profile.id} to profile ${profile.profile_no} - ${profile.name}`)

				lastId = profile.id
				await fastify.monsterController.updateQuery('humans',
					{
						current_profile_no: profile.profile_no,
						area: profile.area,
						latitude: profile.latitude,
						longitude: profile.longitude,
					}, { id: profile.id })
			}
		}
	}
})

run()
setInterval(handleAlarms, 100)
