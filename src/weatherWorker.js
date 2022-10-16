const { parentPort, isMainThread } = require('worker_threads')
const { writeHeapSnapshot } = require('v8')
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100
const NodeCache = require('node-cache')
const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()
const GameData = require('./lib/GameData')
const CachingGeocoder = require('./lib/cachingGeocoder')

const {
	config, knex, dts, geofence, translatorFactory,
} = Config(false)

const WeatherController = require('./controllers/weather')

const cachingGeocoder = new CachingGeocoder(config, log, mustache, 'geoCache-WEATHER')

const rateLimitedUserCache = new NodeCache({ stdTTL: config.discord.limitSec })
const weatherController = new WeatherController(logs.controller, knex, cachingGeocoder, null, config, dts, geofence, GameData, rateLimitedUserCache, translatorFactory, mustache)

const hookQueue = []
const workerId = 'WEATHER'
logs.setWorkerId(workerId)
let queuePort
let commandPort

async function processOne(hook) {
	let queueAddition = []

	try {
		if ((Math.random() * 1000) > 995) log.info(`Worker ${workerId}: WebhookQueue is currently ${hookQueue.length}`)

		switch (hook.type) {
			case 'weather': {
				const result = await weatherController.handle(hook.message)
				if (result) {
					queueAddition = result
				} else {
					log.error(`Worker ${workerId}: Missing result from ${hook.type} processor`, { data: hook.message })
				}
				break
			}
			default:
				log.error(`Worker ${workerId}: Unexpected hook type ${hook.type} in weather controller worker process`, hook)
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
	rateLimitedUserCache.flushAll()
	for (const guy of badguys) {
		rateLimitedUserCache.set(guy.key, guy.ttlTimeout, Math.max((guy.ttlTimeout - Date.now()) / 1000, 1))
	}
}

function reloadDts() {
	try {
		const newDts = require('./lib/dtsloader').readDtsFiles()
		weatherController.setDts(newDts)
		log.info('DTS reloaded')
	} catch (err) {
		log.error('Error reloading dts', err)
	}
}

function reloadGeofence() {
	try {
		const newGeofence = require('./lib/geofenceLoader').readAllGeofenceFiles(config)
		weatherController.setGeofence(newGeofence)
		log.info('Geofence reloaded')
	} catch (err) {
		log.error('Error reloading geofence', err)
	}
}

async function receiveCommand(cmd) {
	try {
		log.debug(`Worker ${workerId}: receiveCommand ${cmd.type}`)
		if (cmd.type === 'heapdump') {
			writeHeapSnapshot()
			return
		}

		if (cmd.type === 'badguys') {
			updateBadGuys(cmd.badguys)
		}

		if (cmd.type === 'reloadDts') {
			log.debug(`Worker ${workerId}: Received dts reload request broadcast`)

			reloadDts()
		}

		if (cmd.type === 'reloadGeofence') {
			log.debug(`Worker ${workerId}: Received geofence reload request broadcast`)

			reloadGeofence()
		}

		if (cmd.type === 'weather') {
			log.debug(`Worker ${workerId}: receiveCommand<weather> ${cmd.weatherCommand}`)

			if (cmd.weatherCommand === 'userCares') {
				weatherController.handleUserCares(cmd.data)
			}
			if (cmd.weatherCommand === 'weatherChanged') {
				const jobs = await weatherController.handleMonsterWeatherChange(cmd.data)
				if (jobs && jobs.length) {
					queuePort.postMessage({
						queue: jobs,
					})
				}
			}
			if (cmd.weatherCommand === 'weatherForecastRequested') {
				await weatherController.getWeather(cmd.data)
			}
		}
	} catch (err) {
		log.error(`Worker ${workerId}: receiveCommand failed to process command`, err)
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
	parentPort.on('message', (msg) => {
		if (msg.type === 'queuePort') {
			queuePort = msg.queuePort
			commandPort = msg.commandPort
			msg.commandPort.on('message', receiveCommand)
			msg.queuePort.on('message', receiveQueue)
		}
	})

	weatherController.on('weatherChanged', broadcastWeather)
}
