require('./lib/configFileCreator')()
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100
const { writeHeapSnapshot } = require('v8')

const fs = require('fs')
const fsp = require('fs').promises
const util = require('util')
const { S2 } = require('s2-geometry')
const { Worker, MessageChannel } = require('worker_threads')
const NodeCache = require('node-cache')
const fastify = require('fastify')({
	bodyLimit: 5242880,
})
const { Telegraf } = require('telegraf')

const path = require('path')
const moment = require('moment-timezone')
const geoTz = require('geo-tz')
const schedule = require('node-schedule')
const telegramCommandParser = require('./lib/telegram/middleware/commandParser')
const telegramController = require('./lib/telegram/middleware/controller')
// const TelegramUtil = require('./lib/telegram/telegramUtil.js')
const DiscordReconciliation = require('./lib/discord/discordReconciliation')
const TelegramReconciliation = require('./lib/telegram/telegramReconciliation')

const { Config } = require('./lib/configFetcher')

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

const telegraf = new Telegraf(config.telegram.token)// , { channelMode: true })
const telegrafChannel = config.telegram.channelToken ? new Telegraf(config.telegram.channelToken)/* , { channelMode: true }) */ : null

const cache = new NodeCache({ stdTTL: 5400, useClones: false }) // 90 minutes

const DiscordWorker = require('./lib/discord/discordWorker')
const DiscordWebhookWorker = require('./lib/discord/discordWebhookWorker')
const DiscordCommando = require('./lib/discord/commando')

const TelegramWorker = require('./lib/telegram/Telegram')

const logs = require('./lib/logger')

const { log } = logs
const re = require('./util/regex')(translatorFactory)

const Query = require('./controllers/query')

const query = new Query(logs.controller, knex, config, geofence)

logs.setWorkerId('MAIN')
fastify.decorate('logger', logs.log)
fastify.decorate('controllerLog', logs.controller)
fastify.decorate('webhooks', logs.webhooks)
fastify.decorate('config', config)
fastify.decorate('knex', knex)
fastify.decorate('cache', cache)
fastify.decorate('query', query)
fastify.decorate('dts', dts)
fastify.decorate('geofence', geofence)
fastify.decorate('translator', translator)
fastify.decorate('discordQueue', [])
fastify.decorate('telegramQueue', [])
fastify.decorate('hookQueue', [])

const discordCommando = config.discord.enabled ? new DiscordCommando(config.discord.token[0], query, config, logs, GameData, dts, geofence, translatorFactory) : null
logs.log.info(`Discord commando ${discordCommando ? '' : ''}starting`)
const discordWorkers = []
let discordWebhookWorker
let telegram
let telegramChannel

if (config.discord.enabled) {
	for (let key = 0; key < config.discord.token.length; key++) {
		if (config.discord.token[key]) {
			discordWorkers.push(new DiscordWorker(config.discord.token[key], key + 1, config, logs, true))
		}
	}
	fastify.decorate('discordWorker', discordWorkers[0])
	discordWebhookWorker = new DiscordWebhookWorker(config, logs, true)
}

if (config.telegram.enabled) {
	telegram = new TelegramWorker('1', config, logs, GameData, dts, geofence, telegramController, query, telegraf, translatorFactory, telegramCommandParser, re, true)

	if (telegrafChannel) {
		telegramChannel = new TelegramWorker('2', config, logs, GameData, dts, geofence, telegramController, query, telegrafChannel, translatorFactory, telegramCommandParser, re, true)
	}
}

let telegramReconciliation

async function syncTelegramMembership() {
	try {
		if (!telegramReconciliation) {
			telegramReconciliation = new TelegramReconciliation(telegraf, log, config, query, dts)
		}
		log.verbose('Verification of Telegram group membership for Poracle users starting...')

		if (config.reconciliation.telegram.updateUserNames || config.reconciliation.telegram.removeInvalidUsers)	{
			await telegramReconciliation.syncTelegramUsers(
				config.reconciliation.discord.updateUserNames,
				config.reconciliation.discord.removeInvalidUsers,
			)
		}
	} catch (err) {
		log.error('Verification of Poracle user\'s roles failed with', err)
	}
	setTimeout(syncTelegramMembership, config.telegram.checkRoleInterval * 3600000)
}

let discordReconciliation

async function syncDiscordRole() {
	try {
		if (!discordReconciliation) {
			const worker = discordWorkers[0]
			if (!worker || worker.busy) {
				// try again in 30 seconds
				setTimeout(syncDiscordRole, 30000)
				return
			}
			discordReconciliation = new DiscordReconciliation(worker.client, log, config, query, dts)
		}
		// "updateChannelNames": true,
		// 	"updateChannelNotes": true,
		// 	"unregisterMissingChannels": true
		if (config.reconciliation.discord.updateChannelNames || config.reconciliation.discord.updateChannelNotes
			|| config.reconciliation.discord.unregisterMissingChannels) {
			await discordReconciliation.syncDiscordChannels(config.reconciliation.discord.updateChannelNames,
				config.reconciliation.discord.updateChannelNotes, config.reconciliation.discord.unregisterMissingChannels)
		}
		// "updateUserNames": true,
		// "removeInvalidUsers": true,
		// "registerNewUsers": true,
		if (config.reconciliation.discord.updateUserNames || config.reconciliation.discord.removeInvalidUsers || config.reconciliation.discord.registerNewUsers)	{
			await discordReconciliation.syncDiscordRole(config.reconciliation.discord.registerNewUsers,
				config.reconciliation.discord.updateUserNames,
				config.reconciliation.discord.removeInvalidUsers)
		}

		// let usersToCheck = await query.selectAllQuery('humans', { type: 'discord:user', admin_disable: 0 })
		// usersToCheck = usersToCheck.filter((user) => !config.discord.admins.includes(user.id))
		// let invalidUsers = []
		// for (const guild of config.discord.guilds) {
		// 	invalidUsers = await roleWorker.checkRole(guild, usersToCheck, config.discord.userRole)
		// 	usersToCheck = invalidUsers
		// }
		// if (invalidUsers[0]) {
		// 	log.info('Invalid users found, removing/disabling from dB...')
		// 	for (const user of invalidUsers) {
		// 		log.info(`Removing ${user.name} - ${user.id} from Poracle dB`)
		// 		if (config.general.roleCheckMode != 'ignore') {
		// 			await removeInvalidUser(user)
		// 		} else {
		// 			log.info('config.general.roleCheckMode is set to ignore, not removing')
		// 		}
		// 	}
		// } else {
		// 	log.verbose('No invalid users found, all good!')
		// }
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
		log.info(`Error processing historic cache ${err}`)
	}
}

function handleShutdown() {
	const workerSaves = []
	for (const worker of discordWorkers) {
		workerSaves.push(worker.saveTimeouts())
	}
	if (telegram) workerSaves.push(telegram.saveTimeouts())
	if (telegramChannel) workerSaves.push(telegramChannel.saveTimeouts())
	if (discordWebhookWorker) workerSaves.push(discordWebhookWorker.saveTimeouts())
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

async function run() {
	process.on('SIGINT', handleShutdown)
	process.on('SIGTERM', handleShutdown)

	if (config.general.persistDuplicateCache) {
		await loadEventCache()
	}

	if (config.discord.enabled) {
		setInterval(() => {
			if (!fastify.discordQueue.length) {
				return
			}

			// Dequeue onto individual queues as fast as possible
			while (fastify.discordQueue.length) {
				const { target, type } = fastify.discordQueue[0]
				let worker
				if (type == 'webhook') {
					worker = discordWebhookWorker
				} else {
					// see if target has dedicated worker
					worker = discordWorkers.find((workerr) => workerr.users.includes(target))
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
				}

				worker.work(fastify.discordQueue.shift())
			}
		}, 100)

		if (config.discord.checkRole && config.discord.checkRoleInterval && config.discord.guilds) {
			setTimeout(syncDiscordRole, 10000)
		}
	}

	if (config.telegram.enabled) {
		setInterval(() => {
			if (!fastify.telegramQueue.length) {
				return
			}

			while (fastify.telegramQueue.length) {
				let worker = telegram
				if (telegramChannel && ['telegram:channel', 'telegram:group'].includes(fastify.telegramQueue[0].type)) {
					worker = telegramChannel
				}

				worker.work(fastify.telegramQueue.shift())
			}
		}, 100)

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

const UserRateChecker = require('./userRateLimit')

const rateChecker = new UserRateChecker(config)

const workers = []
const maxWorkers = config.tuning.webhookProcessingWorkers

async function processMessages(msgs) {
	let newRateLimits = false

	for (const msg of msgs) {
		const destinationId = msg.type == 'webhook' ? msg.name : msg.target
		const destinationType = msg.type
		const rate = rateChecker.validateMessage(destinationId, destinationType)

		let queueMessage
		let logMessage = null

		if (!rate.passMessage) {
			if (rate.justBreached) {
				const userTranslator = translatorFactory.Translator(msg.language || config.general.locale)
				queueMessage = {
					...msg,
					message: { content: userTranslator.translateFormat('You have reached the limit of {0} messages over {1} seconds', rate.messageLimit, rate.messageTimeout) },
					emoji: [],
				}
				log.info(`${msg.logReference}: Stopping alerts (Rate limit) for ${msg.type} ${msg.target} ${msg.name} Time to release: ${rate.resetTime}`)

				if (config.alertLimits.maxLimitsBeforeStop) {
					const userCheck = rateChecker.userIsBanned(destinationId, destinationType)
					if (!userCheck.canContinue) {
						queueMessage = {
							...msg,
							message: {
								content: userTranslator.translateFormat(
									config.alertLimits.disableOnStop
										? 'You have breached the rate limit too many times in the last 24 hours. Your messages are now stopped, contact an administrator to resume'
										: 'You have breached the rate limit too many times in the last 24 hours. Your messages are now stopped, use {0}start to resume',
									['discord:user', 'discord:channel', 'webhook'].includes(msg.type) ? config.discord.prefix : '/',
								),
							},
							emoji: [],
						}

						log.info(`${msg.logReference}: Stopping alerts [until restart] (Rate limit) for ${msg.type} ${msg.target} ${msg.name}`)

						logMessage = `Stopped alerts (rate-limit exceeded too many times) for target ${destinationType} ${destinationId} ${msg.name} ${msg.type == 'discord:user' ? `<@${destinationId}>` : ''}`

						try {
							if (config.alertLimits.disableOnStop) {
								// This acts like the admin de-registered the user rather than when losing a role so user does not get auto re-registered
								await query.updateQuery('humans', { admin_disable: 1, disabled_date: null }, { id: msg.target })
							} else {
								await query.updateQuery('humans', { enabled: 0 }, { id: msg.target })
							}
						} catch (err) {
							log.error('Failed to stop user messages', err)
						}
					}
				}

				newRateLimits = true
			} else {
				log.info(`${msg.logReference}: Intercepted and stopped message for user (Rate limit) for ${msg.type} ${msg.target} ${msg.name} Time to release: ${rate.resetTime}`)

				queueMessage = null
			}
		} else {
			queueMessage = msg
		}

		if (queueMessage) {
			if (['discord:user', 'discord:channel', 'webhook'].includes(queueMessage.type)) fastify.discordQueue.push(queueMessage)
			if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(queueMessage.type)) fastify.telegramQueue.push(queueMessage)
			if (logMessage && config.discord.dmLogChannelID) {
				fastify.discordQueue.push({
					lat: 0,
					lon: 0,
					message: {
						content: logMessage,
					},
					target: config.discord.dmLogChannelID,
					type: 'discord:channel',
					name: 'Log channel',
					tth: { hours: 0, minutes: config.discord.dmLogChannelDeletionTime, seconds: 0 },
					clean: config.discord.dmLogChannelDeletionTime > 0,
					emoji: '',
					logReference: queueMessage.logReference,
					language: config.general.locale,
				})
			}
		}
	}

	if (newRateLimits) {
		// Publish new rate limits to controllers
		const badguys = rateChecker.getBadBoys()

		for (const worker of workers) {
			worker.commandPort.postMessage({
				type: 'badguys',
				badguys,
			})
		}
	}
}

let worker = new Worker(path.join(__dirname, './weatherWorker.js'))
let queueChannel = new MessageChannel()
let commandChannel = new MessageChannel()

worker.postMessage({
	type: 'queuePort',
	queuePort: queueChannel.port2,
	commandPort: commandChannel.port2,
}, [queueChannel.port2, commandChannel.port2])

const weatherWorker = {
	worker,
	commandPort: commandChannel.port1,
	queuePort: queueChannel.port1,
}

worker = new Worker(path.join(__dirname, './statsWorker.js'))
queueChannel = new MessageChannel()
commandChannel = new MessageChannel()

worker.postMessage({
	type: 'queuePort',
	queuePort: queueChannel.port2,
	commandPort: commandChannel.port2,
}, [queueChannel.port2, commandChannel.port2])

const statsWorker = {
	worker,
	commandPort: commandChannel.port1,
	queuePort: queueChannel.port1,
}

function processMessageFromControllers(msg) {
	// Relay commands of weather type to weather controller
	if (msg.type == 'weather') {
		weatherWorker.commandPort.postMessage(msg)
	}
	// No commands from controllers to stats, but would be relayed here
}

function processMessageFromWeather(msg) {
	// Relay broadcasts from weather to all controllers

	if (msg.type == 'weatherBroadcast') {
		for (const relayWorker of workers) {
			relayWorker.commandPort.postMessage(msg)
		}
	}
}

function processMessageFromStats(msg) {
	// Relay broadcasts from stats to all controllers

	if (msg.type == 'statsBroadcast') {
		for (const relayWorker of workers) {
			relayWorker.commandPort.postMessage(msg)
		}
	}
}

weatherWorker.commandPort.on('message', processMessageFromWeather)
weatherWorker.queuePort.on('message', (res) => {
	processMessages(res.queue)
})

statsWorker.commandPort.on('message', processMessageFromStats)
statsWorker.queuePort.on('message', (res) => {
	processMessages(res.queue)
})

for (let w = 0; w < maxWorkers; w++) {
	worker = new Worker(path.join(__dirname, './controllerWorker.js'), {
		workerData:
			{
				workerId: w + 1,
			},
	})

	queueChannel = new MessageChannel()
	commandChannel = new MessageChannel()

	worker.postMessage({
		type: 'queuePort',
		queuePort: queueChannel.port2,
		commandPort: commandChannel.port2,
	}, [queueChannel.port2, commandChannel.port2])

	queueChannel.port1.on('message', (res) => {
		processMessages(res.queue)
	})
	commandChannel.port1.on('message', processMessageFromControllers)

	//	worker.on('error', (error) => console.error('error', error))
	//	worker.on('exit', () => console.log('exit'))

	workers.push({
		worker,
		commandPort: commandChannel.port1,
		queuePort: queueChannel.port1,
	})
}

process.on('SIGUSR2', () => {
	writeHeapSnapshot()
	for (const dumpWorker of workers) {
		dumpWorker.commandPort.postMessage({ type: 'heapdump' })
	}
	weatherWorker.commandPort.postMessage({ type: 'heapdump' })
	statsWorker.commandPort.postMessage({ type: 'heapdump' })
})

let currentWorkerNo = 0

async function processOne(hook) {
	currentWorkerNo = (currentWorkerNo + 1) % maxWorkers

	try {
		let processHook

		switch (hook.type) {
			case 'pokemon': {
				if (config.general.disablePokemon) {
					fastify.controllerLog.debug(`${hook.message.encounter_id}: Wild encounter was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info(`pokemon ${JSON.stringify(hook.message)}`)
				const verifiedSpawnTime = (hook.message.verified || hook.message.disappear_time_verified)
				const cacheKey = `${hook.message.encounter_id}${verifiedSpawnTime ? 'T' : 'F'}${hook.message.cp}`
				if (fastify.cache.get(cacheKey)) {
					fastify.controllerLog.debug(`${hook.message.encounter_id}: Wild encounter was sent again too soon, ignoring`)
					break
				}

				// Set cache expiry to calculated pokemon expiry + 5 minutes to cope with near misses; or 60 minutes (3600s) in the case of an unverified spawn

				const secondsRemaining = !verifiedSpawnTime ? 3600 : (Math.max((hook.message.disappear_time * 1000 - Date.now()) / 1000, 0) + 300)

				fastify.cache.set(cacheKey, 'x', secondsRemaining)

				processHook = hook

				// also post directly to stats controller
				statsWorker.queuePort.postMessage(hook)

				break
			}
			case 'raid': {
				if (config.general.disableRaid) {
					fastify.controllerLog.debug(`${hook.message.gym_id}: Raid was received but set to be ignored in config`)

					break
				}
				fastify.webhooks.info(`raid ${JSON.stringify(hook.message)}`)
				const cacheKey = `${hook.message.gym_id}${hook.message.end}${hook.message.pokemon_id}`

				if (fastify.cache.get(cacheKey)) {
					fastify.controllerLog.debug(`${hook.message.gym_id}: Raid was sent again too soon, ignoring`)
					break
				}

				fastify.cache.set(cacheKey, 'x')

				processHook = hook

				break
			}
			case 'invasion':
			case 'pokestop': {
				if (config.general.disablePokestop) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Pokestop was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info(`pokestop(${hook.type}) ${JSON.stringify(hook.message)}`)
				const incidentExpiration = hook.message.incident_expiration ? hook.message.incident_expiration : hook.message.incident_expire_timestamp
				const lureExpiration = hook.message.lure_expiration
				if (!lureExpiration && !incidentExpiration) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Pokestop received but no invasion or lure information, ignoring`)
					break
				}
				if (lureExpiration && !config.general.disableLure) {
					const cacheKey = `${hook.message.pokestop_id}L${lureExpiration}`

					if (fastify.cache.get(cacheKey)) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Lure was sent again too soon, ignoring`)
						break
					}

					// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
					const secondsRemaining = Math.max((lureExpiration * 1000 - Date.now()) / 1000, 0) + 300

					fastify.cache.set(cacheKey, 'x', secondsRemaining)

					processHook = hook
				} else if (!config.general.disableInvasion) {
					const cacheKey = `${hook.message.pokestop_id}I${lureExpiration}`

					if (fastify.cache.get(cacheKey)) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Invasion was sent again too soon, ignoring`)
						break
					}

					// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
					const secondsRemaining = Math.max((incidentExpiration * 1000 - Date.now()) / 1000, 0) + 300

					fastify.cache.set(cacheKey, 'x', secondsRemaining)

					processHook = hook
				}
				break
			}
			case 'quest': {
				if (config.general.disableQuest) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Quest was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info(`quest ${JSON.stringify(hook.message)}`)
				const cacheKey = `${hook.message.pokestop_id}_${JSON.stringify(hook.message.rewards)}`

				if (fastify.cache.get(cacheKey)) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Quest was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(cacheKey, 'x')
				processHook = hook

				break
			}
			case 'nest': {
				if (config.general.disableNest) {
					fastify.controllerLog.debug(`${hook.message.nest_id}: Nest was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info(`nest ${JSON.stringify(hook.message)}`)
				const cacheKey = `${hook.message.nest_id}_${hook.message.pokemon_id}_${hook.message.reset_time}`
				if (fastify.cache.get(cacheKey)) {
					fastify.controllerLog.debug(`${hook.message.nest_id}: Nest was sent again too soon, ignoring`)
					break
				}

				// expiry time -- 14 days (!) after reset time
				const secondsRemaining = Math.max(((hook.message.reset_time + 14 * 24 * 60 * 60) * 1000 - Date.now()) / 1000, 0)

				fastify.cache.set(cacheKey, 'x', secondsRemaining)
				processHook = hook

				break
			}

			case 'weather': {
				if (config.general.disableWeather) break
				fastify.webhooks.info(`weather ${JSON.stringify(hook.message)}`)
				if (hook.message.updated) {
					const weatherCellKey = S2.latLngToKey(hook.message.latitude, hook.message.longitude, 10)
					hook.message.s2_cell_id = S2.keyToId(weatherCellKey)
				}
				const updateTimestamp = hook.message.time_changed || hook.message.updated
				const hookHourTimestamp = updateTimestamp - (updateTimestamp % 3600)
				const cacheKey = `${hook.message.s2_cell_id}_${hookHourTimestamp}`
				if (fastify.cache.get(cacheKey)) {
					fastify.controllerLog.debug(`${hook.message.s2_cell_id}: Weather for this cell was sent again too soon, ignoring`)
					break
				}
				fastify.cache.set(cacheKey, 'x')

				// post directly to weather controller
				weatherWorker.queuePort.postMessage(hook)
				//	processHook = hook

				break
			}
			default:
				fastify.webhooks.info(`${hook.type} [unrecognised] ${JSON.stringify(hook.message)}`)
				break
		}
		if (processHook) {
			await workers[currentWorkerNo].queuePort.postMessage(processHook)
		}
	} catch (err) {
		fastify.controllerLog.error('Hook processor error (something wasn\'t caught higher)', err)
	}
}

async function handleAlarms() {
	if (fastify.hookQueue.length) {
		if ((Math.random() * 1000) > 995) fastify.logger.verbose(`Inbound WebhookQueue is currently ${fastify.hookQueue.length}`)

		await processOne(fastify.hookQueue.shift())
		setImmediate(handleAlarms)
	}
}

async function currentStatus() {
	let discordQueueLength = 0
	for (const w of discordWorkers) {
		discordQueueLength += w.discordQueue.length
	}
	const telegramQueueLength = (telegram ? telegram.telegramQueue.length : 0)
		+ (telegramChannel ? telegramChannel.telegramQueue.length : 0)

	const webhookQueueLength = discordWebhookWorker ? discordWebhookWorker.webhookQueue.length : 0
	log.info(`[Main] Queues: Inbound webhook ${fastify.hookQueue.length} | Discord: ${discordQueueLength} + ${webhookQueueLength} | Telegram: ${telegramQueueLength}`)
	log.verbose(`Duplicate cache stats: ${JSON.stringify(fastify.cache.getStats())}`)
}

const NODE_MAJOR_VERSION = process.versions.node.split('.')[0]
if (NODE_MAJOR_VERSION < 12) {
	throw new Error('Requires Node 12 or 14')
}
// if (NODE_MAJOR_VERSION == 13) {
//	throw new Error('Requires Node 12 or 14')
// }
if (NODE_MAJOR_VERSION > 14) {
	throw new Error('Requires Node 12 or 14')
}

schedule.scheduleJob({ minute: [0, 10, 20, 30, 40, 50] }, async () => {			// Run every 10 minutes - note if this changes then check below also needs to change
	try {
		log.verbose('Profile Check: Checking for active profile changes')
		const humans = await query.selectAllQuery('humans', {})
		const profilesToCheck = await query.misteryQuery('SELECT * FROM profiles WHERE LENGTH(active_hours)>5 ORDER BY id, profile_no')

		let lastId
		for (const profile of profilesToCheck) {
			const human = humans.find((x) => x.id == profile.id)

			let nowForHuman = moment()
			if (human.latitude) {
				nowForHuman = moment().tz(geoTz(human.latitude, human.longitude).toString())
			}

			if (profile.id != lastId) {
				const timings = JSON.parse(profile.active_hours)
				const nowHour = nowForHuman.hour()
				const nowMinutes = nowForHuman.minutes()
				const nowDow = nowForHuman.isoWeekday()
				const yesterdayDow = nowDow == 1 ? 7 : nowDow - 1

				const active = timings.some((row) => (
					(row.day == nowDow && row.hours == nowHour && nowMinutes >= row.mins && (nowMinutes - row.mins) < 10) // within 10 minutes in same hour
					|| (nowMinutes < 10 && row.day == nowDow && row.hours == nowHour - 1 && row.mins > 50) // first 10 minutes of new hour
					|| (nowHour == 0 && nowMinutes < 10 && row.day == yesterdayDow && row.hours == 23 && row.mins > 50) // first 10 minutes of day
				))

				if (active) {
					if (human.current_profile_no != profile.profile_no) {
						const userTranslator = translatorFactory.Translator(human.language || config.general.locale)

						const job = {
							type: human.type,
							target: human.id,
							name: human.name,
							ping: '',
							clean: false,
							message: { content: userTranslator.translateFormat('I have set your profile to: {0}', profile.name) },
							logReference: '',
							tth: { hours: 1, minutes: 0, seconds: 0 },
						}

						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) fastify.discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) fastify.telegramQueue.push(job)

						log.info(`Profile Check: Setting ${profile.id} to profile ${profile.profile_no} - ${profile.name}`)

						lastId = profile.id
						await query.updateQuery('humans',
							{
								current_profile_no: profile.profile_no,
								area: profile.area,
								latitude: profile.latitude,
								longitude: profile.longitude,
							}, { id: profile.id })
					}
				}
			}
		}
	} catch (err) {
		log.error('Error setting profiles', err)
	}
})

run()
setInterval(handleAlarms, 100)
setInterval(currentStatus, 60000)
