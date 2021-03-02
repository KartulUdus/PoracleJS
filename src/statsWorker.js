const { parentPort, isMainThread } = require('worker_threads')
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100
const schedule = require('node-schedule')
const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')

const {
	config
} = Config(false)

const StatsController = require('./controllers/stats')

const statsController = new StatsController(logs.controller, config)

const hookQueue = []
const workerId = 'STATS'
let queuePort
let commandPort

async function processOne(hook) {
	try {
		if ((Math.random() * 100000) > 99995) log.info(`Worker ${workerId}: WebhookQueue is currently ${hookQueue.length}`)

		switch (hook.type) {
			case 'pokemon': {
				await statsController.handle(hook.message)
				break
			}
			default:
				log.error(`Worker ${workerId}: Unexpected hook type ${hook.type} in stats worker process`)
		}
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