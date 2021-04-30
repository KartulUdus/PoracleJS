const { parentPort, workerData, isMainThread } = require('worker_threads')
const { writeHeapSnapshot } = require('v8')
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100
const NodeCache = require('node-cache')

const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

const { workerId } = workerData
logs.setWorkerId(workerId)

const {
	config, knex, dts, geofence, translatorFactory,
} = Config(false)

const GameData = {
	monsters: require('./util/monsters'),
	utilData: require('./util/util'),
	moves: require('./util/moves'),
	items: require('./util/items'),
	grunts: require('./util/grunts'),
}

const MonsterController = require('./controllers/monster')
const RaidController = require('./controllers/raid')
const QuestController = require('./controllers/quest')
const PokestopController = require('./controllers/pokestop')
const PokestopLureController = require('./controllers/pokestop_lure')
const NestController = require('./controllers/nest')
const ControllerWeatherManager = require('./controllers/weatherData')
const StatsData = require('./controllers/statsData')

/**
 * Contains currently rate limited users
 * @type {NodeCache}
 */
const rateLimitedUserCache = new NodeCache({ stdTTL: config.alertLimits.timingPeriod })

const controllerWeatherManager = new ControllerWeatherManager(config, log)
const statsData = new StatsData(config, log)

const monsterController = new MonsterController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache, controllerWeatherManager, statsData)
const raidController = new RaidController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache, controllerWeatherManager, statsData)
const questController = new QuestController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache, controllerWeatherManager, statsData)
const pokestopController = new PokestopController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache, controllerWeatherManager, statsData)
const nestController = new NestController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache, controllerWeatherManager, statsData)
const pokestopLureController = new PokestopLureController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache, controllerWeatherManager, statsData)

const hookQueue = []
let queuePort
let commandPort

async function processOne(hook) {
	let queueAddition = []

	try {
		if ((Math.random() * 1000) > 995) log.verbose(`Worker ${workerId}: WebhookQueue is currently ${hookQueue.length}`)

		switch (hook.type) {
			case 'pokemon': {
				const result = await monsterController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
				}

				break
			}
			case 'raid': {
				const result = await raidController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
				}
				break
			}
			case 'invasion':
			case 'pokestop': {
				if (hook.message.lure_expiration) {
					const result = await pokestopLureController.handle(hook.message)
					if (result) {
						queueAddition = result
					} else {
						log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
					}
				} else {
					const result = await pokestopController.handle(hook.message)
					if (result) {
						queueAddition = result
					} else {
						log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
					}
				}
				break
			}
			case 'quest': {
				const result = await questController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
				}
				break
			}
			case 'nest': {
				const result = await nestController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
				}
				break
			}
			default:
				log.error(`Worker ${workerId}: Unexpected hook type  ${hook.type} in general controller worker process`, { data: hook.message })
		}

		if (queueAddition && queueAddition.length) {
			await queuePort.postMessage({
				queue: queueAddition,
			})
		}
	} catch (err) {
		log.error(`Worker ${workerId}: Hook processor error (something wasn't caught higher)`, err)
	}
}

const PromiseQueue = require('./lib/PromiseQueue')

const alarmProcessor = new PromiseQueue(hookQueue, config.tuning.concurrentWebhookProcessorsPerWorker)

function receiveQueue(msg) {
	try {
		hookQueue.push(msg)
		alarmProcessor.run(processOne, async (err) => {
			// eslint-disable-next-line no-console
			console.error(err)
			log.error(`Worker ${workerId}: alarmProcessor exception`, err)
		})
	} catch (err) {
		log.error(`Worker ${workerId}: receiveCommand failed to add new queue entry`, err)
	}
}

function updateBadGuys(badguys) {
	rateLimitedUserCache.flushAll()
	for (const guy of badguys) {
		rateLimitedUserCache.set(guy.key, guy.ttlTimeout, Math.max((guy.ttlTimeout - Date.now()) / 1000, 1))
	}
}

function receiveCommand(cmd) {
	try {
		log.debug(`Worker ${workerId}: receiveCommand ${cmd.type}`)

		if (cmd.type == 'heapdump') {
			writeHeapSnapshot()
			return
		}

		if (cmd.type == 'badguys') {
			log.debug(`Worker ${workerId}: Received badguys`, cmd.badguys)

			updateBadGuys(cmd.badguys)
		}
		if (cmd.type == 'weatherBroadcast') {
			log.debug(`Worker ${workerId}: Received weather broadcast`, cmd.data)

			controllerWeatherManager.receiveWeatherBroadcast(cmd.data)
		}
		if (cmd.type == 'statsBroadcast') {
			log.debug(`Worker ${workerId}: Received stats broadcast`, cmd.data)

			statsData.receiveStatsBroadcast(cmd.data)
		}
	} catch (err) {
		log.error(`Worker ${workerId}: receiveCommand failed to processs command`, err)
	}
}

function notifyWeatherController(cmd, data) {
	log.debug(`Worker ${workerId}: Sending notify weather controlled command: ${cmd}`, data)

	commandPort.postMessage({
		type: 'weather',
		weatherCommand: cmd,
		data,
	})
}

async function currentStatus() {
	log.info(`[Worker ${workerId}] Queues: WebhookQueue is currently ${hookQueue.length}`)
}

if (!isMainThread) {
	process.on('unhandledRejection', (reason) => {
		// eslint-disable-next-line no-console
		console.error(`Worker ${workerId} Unhandled Rejection at: ${reason.stack || reason}`)

		log.error(`Unhandled Rejection at: ${reason.stack || reason}`)
	})

	process.on('uncaughtException', (err) => {
		// eslint-disable-next-line no-console
		console.error(`Worker ${workerId} Unhandled Rejection at: ${err.stack || err}`)

		log.error(err)
	})

	parentPort.on('message', (msg) => {
		if (msg.type == 'queuePort') {
			queuePort = msg.queuePort
			commandPort = msg.commandPort

			msg.commandPort.on('message', receiveCommand)
			msg.queuePort.on('message', receiveQueue)
		}
	})

	controllerWeatherManager.on('weatherChanged', (data) => notifyWeatherController('weatherChanged', data))
	controllerWeatherManager.on('weatherForecastRequested', (data) => notifyWeatherController('weatherForecastRequested', data))

	monsterController.on('userCares', (data) => notifyWeatherController('userCares', data))
	setInterval(currentStatus, 60000)
}