const { parentPort, workerData, isMainThread } = require('worker_threads')

const NodeCache = require('node-cache')
const pcache = require('flat-cache')
const path = require('path')
const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

console.log('hi from worker')

// const { workerId } = workerData
// console.log(workerId)

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
const WeatherController = require('./controllers/weather')

// problem, synchronisation
const discordCache = new NodeCache({ stdTTL: config.discord.limitSec })

const weatherController = new WeatherController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache)

const hookQueue = []
const workerId = 'WEATHER'
let queuePort

async function processOne(hook) {
	let queueAddition = []

	try {
		if ((Math.random() * 1000) > 995) log.info(`Worker ${workerId}: WebhookQueue is currently ${hookQueue.length}`)

		switch (hook.type) {
			case 'weather': {
				const result = []// await weatherController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			default:
				log.error(`Worker ${workerId}: Unexpected hook type ${hook.type} in weather controller worker process`, hook.message)
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
		log.debug(`Worker ${workerId}: receiveCommand ${cmd.type}`)
		if (cmd.type == 'badguys') {
			updateBadGuys(cmd.badguys)
		}
		if (cmd.type == 'weather') {
			if (cmd.weatherCommand == 'userCares') {
				weatherController.handleUserCares(cmd.data)
			}
			if (cmd.weatherCommand == 'weatherChanged') {
				const jobs = weatherController.handleMonsterWeatherChange(cmd.data)
				if (jobs && jobs.length) {
					queuePort.postMessage({
						queue: jobs,
					})
				}
			}
			if (cmd.weatherCommand == 'weatherChange') {
				//				weatherController.handleMonsterWeatherChange(cmd.data)
			}
		}
	} catch (err) {
		log.error('Worker ${workerId}: receiveCommand failed to processs command', err)
	}
}

function broadcastWeather(cmd) {
	log.debug(`Worker ${workerId}: Broadcasting weather info`, cmd)
	commandPort.postMessage({
		type: 'weatherBroadcast',
		data: cmd,
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

	weatherController.on('weatherChanged', broadcastWeather)
	// weatherController.on('weatherNotices', )
}