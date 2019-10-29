require('./lib/configFileCreator')()
require('dotenv').config()

const fs = require('fs')
const util = require('util')
const { promisify } = require('util')

const readFileAsync = promisify(fs.readFile)
const NodeCache = require('node-cache')
const fastify = require('fastify')()

const Config = require('./lib/configFetcher')
const mustache = require('./lib/handlebars')()

let {
	config, knex, dts, geofence, translator,
} = Config()

const readDir = util.promisify(fs.readdir)


const cache = new NodeCache({ stdTTL: 5400 })

const discordCache = new NodeCache({ stdTTL: config.discord.limitsec })

const DiscordWorker = require('./lib/discordWorker')
const DiscordCommando = require('./lib/discord/commando/')

const log = require('./lib/logger')
const monsterData = require('./util/monsters')
const utilData = require('./util/util')


const MonsterController = require('./controllers/monster')
const RaidController = require('./controllers/raid')
const QuestController = require('./controllers/quest')


const monsterController = new MonsterController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache)
const raidController = new RaidController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache)
const questController = new QuestController(knex, config, dts, geofence, monsterData, discordCache, translator, mustache)

fastify.decorate('logger', log)
fastify.decorate('config', config)
fastify.decorate('knex', knex)
fastify.decorate('cache', cache)
fastify.decorate('monsterController', monsterController)
fastify.decorate('raidController', raidController)
fastify.decorate('questController', questController)
fastify.decorate('dts', dts)
fastify.decorate('geofence', geofence)
fastify.decorate('translator', translator)
fastify.decorate('discordQueue', [])
fastify.decorate('telegramQueue', [])
let discordCommando = DiscordCommando(knex, config, log, monsterData, utilData, dts, geofence, translator)
log.info(`Discord commando ${discordCommando ? '' : ''}starting`)
let discordWorkers = []
for (const key in config.discord.token) {
	if (config.discord.token[key]) {
		discordWorkers.push(new DiscordWorker(config.discord.token[key], key, config))
	}
}

fs.watch('./config/', async (event, fileName) => {
	if (!fileName.endsWith('.json')) return
	discordWorkers = []
	discordCommando = null

	const newFile = await readFileAsync(`./config/${fileName}`, 'utf8')
	try {
		JSON.parse(newFile)
		const newConfigs = Config()

		config = newConfigs.config
		knex = newConfigs.knex
		dts = newConfigs.dts
		geofence = newConfigs.geofence
		translator = newConfigs.translator

		for (const key in config.discord.token) {
			if (config.discord.token[key]) {
				discordWorkers.push(new DiscordWorker(config.discord.token[key], key, config))
			}
		}
		discordCommando = DiscordCommando(knex, config, log, monsterData, utilData, dts, geofence, translator)
		fastify.config = config
		fastify.knex = knex
		fastify.dts = dts
		fastify.geofence = geofence
		fastify.translator = translator
	} catch (err) {
		log.warn('new config file unhappy: ', err)
	}
})

async function run() {
	setInterval(() => {
		if (!fastify.discordQueue.length) {
			return
		}
		const target = !fastify.discordQueue.slice(-1).shift()[0]
		// see if target has dedicated worker
		let worker = discordWorkers.find((workerr) => workerr.users.includes(target.id))
		if (!worker) {
			worker = discordWorkers.reduce((prev, curr) => (prev.users.length < curr.users.length ? prev : curr))
			worker.addUser(target.id)
		}
		if (!worker.busy) worker.work(fastify.discordQueue.shift())
	}, 10)

	const routeFiles = await readDir(`${__dirname}/routes/`)
	const routes = routeFiles.map((fileName) => `${__dirname}/routes/${fileName}`)

	routes.forEach((route) => fastify.register(require(route)))
	await fastify.listen(config.server.port, config.server.host)
	log.info(`Service started on ${fastify.server.address().address}:${fastify.server.address().port}`)
}

run()
