const { parentPort, workerData, isMainThread } = require('worker_threads')

const NodeCache = require('node-cache')
const pcache = require('flat-cache')
const path = require('path')
const logs = require('./lib/logger')

const { log } = logs

const { Config } = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

console.log('hi from worker')
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
const weatherCache = pcache.load('.weatherCache', path.resolve(`${__dirname}../../`))
const weatherCacheData = weatherCache.getKey('weatherCacheData')

const MonsterController = require('./controllers/monster')
const RaidController = require('./controllers/raid')
const QuestController = require('./controllers/quest')
const PokestopController = require('./controllers/pokestop')
const WeatherController = require('./controllers/weather')

// problem, synchronisation
const discordCache = new NodeCache({ stdTTL: config.discord.limitSec })

const weatherController = new WeatherController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, null, weatherCacheData)
const monsterController = new MonsterController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const raidController = new RaidController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const questController = new QuestController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)
const pokestopController = new PokestopController(logs.controller, knex, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherController, null)

async function processOne(hook) {
	const discordQueue = []
	const telegramQueue = []

	try {
		switch (hook.type) {
			case 'pokemon': {
				const result = await monsterController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) telegramQueue.push(job)
					})
				} else {
					log.error(`Missing result from ${hook.type} processor`, hook.message)
				}

				break
			}
			case 'raid': {
				const result = await raidController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) telegramQueue.push(job)
					})
				} else {
					log.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			case 'invasion':
			case 'pokestop': {
				const result = await pokestopController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) telegramQueue.push(job)
					})
				} else {
					log.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			case 'quest': {
				const q = hook

				const result = await questController.handle(q)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) telegramQueue.push(job)
					})
				} else {
					log.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			case 'weather': {
				const result = await weatherController.handle(hook.message)
				if (result) {
					result.forEach((job) => {
						if (['discord:user', 'discord:channel', 'webhook'].includes(job.type)) discordQueue.push(job)
						if (['telegram:user', 'telegram:channel', 'telegram:group'].includes(job.type)) telegramQueue.push(job)
					})
				} else {
					log.error(`Missing result from ${hook.type} processor`, hook.message)
				}
				break
			}
			default:
		}

		if (discordQueue.length || telegramQueue.length) {
			parentPort.postMessage({
				discordQueue,
				telegramQueue,
			})
		}
	} catch (err) {
		console.log(err)
		log.error('Hook processor error (something wasn\'t caught higher)', err)
	}
}

const hookQueue = []

const PromiseQueue = require('./lib/PromiseQueue')

const alarmProcessor = new PromiseQueue(hookQueue, 10)

if (!isMainThread) {
	console.log('worker')
	parentPort.on('message', (msg) => {
		//		console.log(`on worker thread received ${JSON.stringify(msg)}`)
		if ((Math.random() * 100) > 80) console.log(`WebhookQueue is currently ${hookQueue.length}`)

		hookQueue.push(msg)
		alarmProcessor.run(processOne)
	})
}