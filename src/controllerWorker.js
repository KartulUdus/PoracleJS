const { parentPort, workerData, isMainThread } = require('worker_threads')

const NodeCache = require('node-cache')
const pcache = require('flat-cache')
const path = require('path')
const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

console.log('hi from worker')

const { workerId } = workerData
console.log(workerId)

const {
	config, knex, dts, geofence, translator, translatorFactory,
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
const ControllerWeatherManager = require('./controllers/controllerWeatherManager')
/**
 * Contains currently rate limited users
 * @type {NodeCache}
 */
const discordCache = new NodeCache({ stdTTL: config.discord.limitSec })

const controllerWeatherManager = new ControllerWeatherManager(config, log)

const monsterController = new MonsterController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, controllerWeatherManager)
const raidController = new RaidController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, controllerWeatherManager)
const questController = new QuestController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, controllerWeatherManager)
const pokestopController = new PokestopController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, controllerWeatherManager)

const hookQueue = []
let queuePort
let commandPort

async function processOne(hook) {
	let queueAddition = []

	try {
		if ((Math.random() * 1000) > 995) log.info(`Worker ${workerId}: WebhookQueue is currently ${hookQueue.length}`)

		switch (hook.type) {
			case 'pokemon': {
				const result = await monsterController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, hook.message)
				}

				break
			}
			case 'raid': {
				const result = await raidController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			case 'invasion':
			case 'pokestop': {
				const result = await pokestopController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			case 'quest': {
				const result = await questController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			default:
				log.error(`Worker ${workerId}: Unexpected hook type  ${hook.type} in general controller worker process`, hook.message)
		}

		if (queueAddition && queueAddition.length) {
			await queuePort.postMessage({
				queue: queueAddition,
			})
		}
	} catch (err) {
		console.log(err)
		log.error(`Worker ${workerId}: Hook processor error (something wasn't caught higher)`, err)
	}
}

const PromiseQueue = require('./lib/PromiseQueue')

const alarmProcessor = new PromiseQueue(hookQueue, 10)

function receiveQueue(msg) {
	try {
		hookQueue.push(msg)
		alarmProcessor.run(processOne)
	} catch (err) {
		log.error(`Worker ${workerId}: receiveCommand failed to add new queue entry`, err)
	}
}

function updateBadGuys(badguys) {
	discordCache.flushAll()
	for (const guy of badguys) {
		discordCache.set(guy.key, guy.ttlTimeout, Math.max((guy.ttlTimeout - Date.now()) / 1000, 1))
	}
}

function receiveCommand(cmd) {
	try {
		console.log('receiveCommand')
		if (cmd.type == 'badguys') {
			log.debug(`Worker ${workerId}: Received badguys`, cmd.badguys)

			updateBadGuys(cmd.badguys)
		}
		if (cmd.type == 'weatherBroadcast') {
			log.debug(`Worker ${workerId}: Received weather broadcast`, cmd.data)

			controllerWeatherManager.receiveWeatherBroadcast(cmd.data)
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

if (!isMainThread) {
	console.log('worker')

	parentPort.on('message', (msg) => {
		//		console.log(`on worker thread received ${JSON.stringify(msg)}`)

		if (msg.type == 'queuePort') {
			queuePort = msg.queuePort
			commandPort = msg.commandPort

			msg.commandPort.on('message', receiveCommand)
			msg.queuePort.on('message', receiveQueue)
		}
	})

	controllerWeatherManager.on('weatherChanged', (data) => notifyWeatherController('weatherChanged', data))

	monsterController.on('userCares', (data) => notifyWeatherController('userCares', data))
	// monsterController.on('executeWeatherCommand', notifyWeatherController)
}