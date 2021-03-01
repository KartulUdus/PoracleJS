const { parentPort, isMainThread } = require('worker_threads')
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100
const NodeCache = require('node-cache')
const schedule = require('node-schedule')
const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

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

const StatsController = require('./controllers/stats')

const rateLimitedUserCache = new NodeCache({ stdTTL: config.discord.limitSec }) // does not actually make sense to have this, perhaps we don't need to derive from controller for
// the stats calculator - or just null and make safe

const statsController = new StatsController(logs.controller, knex, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache)

const hookQueue = []
const workerId = 'STATS'
let queuePort
let commandPort

async function processOne(hook) {
	try {
		if ((Math.random() * 1000) > 995) log.info(`Worker ${workerId}: WebhookQueue is currently ${hookQueue.length}`)

		switch (hook.type) {
			case 'pokemon': {
				await statsController.handle(hook.message)
//				const result = await statsController.handle(hook.message)
//				if (result) {
//					queueAddition = result
//				} else {
//					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
//				}
				break
			}
			default:
				log.error(`Worker ${workerId}: Unexpected hook type ${hook.type} in stats worker process`)
		}

//		if (queueAddition && queueAddition.length) {
//			await queuePort.postMessage({
//				queue: queueAddition,
//			})
//		}
	} catch (err) {
		log.error(`Worker ${workerId}: Hook processor error (something wasn't caught higher)`, err)
	}
}

function receiveQueue(msg) {
	try {
		hookQueue.push(msg)
	} catch (err) {
		log.error(`Worker ${workerId}: receiveCommand failed to add new queue entry`, err)
	}
}

async function receiveCommand(cmd) {
	try {
		log.debug(`Worker ${workerId}: receiveCommand ${cmd.type}`)
	} catch (err) {
		log.error(`Worker ${workerId}: receiveCommand failed to process command`, err)
	}
}

function broadcastStats(cmd) {
	log.debug(`Worker ${workerId}: Broadcasting stats info`, cmd)
	commandPort.postMessage({
		type: 'statsBroadcast',
		data: cmd,
	})
}

async function processQueue() {
	if (hookQueue.length) {
		await processOne(hookQueue.shift())
		setImmediate(processQueue)
	}
}

if (!isMainThread) {
	parentPort.on('message', (msg) => {
		if (msg.type == 'queuePort') {
			queuePort = msg.queuePort
			commandPort = msg.commandPort
			msg.commandPort.on('message', receiveCommand)
			msg.queuePort.on('message', receiveQueue)
		}
	})

	statsController.on('statsChanged', broadcastStats)
	setInterval(processQueue, 100)

	const raritySchedule = []
	let i
	for (i = 0; i < 60; i += config.stats.rarityRefreshInterval) {
		raritySchedule.push(i)
	}
	schedule.scheduleJob({ minute: raritySchedule }, () => {
		try {
			log.verbose('Calculating stats')

			broadcastStats(statsController.calculateRarity())
		} catch (err) {
			log.error('Error calculating stats ', err)
		}
	})
}