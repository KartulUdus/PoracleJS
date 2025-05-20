process.title = 'PoracleJS'
require('./lib/configFileCreator')()
// eslint-disable-next-line no-underscore-dangle
require('events').EventEmitter.prototype._maxListeners = 100
const { writeHeapSnapshot } = require('v8')

const fs = require('fs')
const util = require('util')
const { S2 } = require('s2-geometry')
const { Worker, MessageChannel } = require('worker_threads')
const NodeCache = require('node-cache')
const pcache = require('flat-cache')
const fastify = require('fastify')({
	bodyLimit: 52428800,
	maxParamLength: 256,
})
const stringify = require('fast-json-stable-stringify')
const { Telegraf } = require('telegraf')
const Ohbem = require('ohbem')
const path = require('path')
const chokidar = require('chokidar')
const moment = require('moment-timezone')
const geoTz = require('geo-tz')
const schedule = require('node-schedule')
const telegramCommandParser = require('./lib/telegram/middleware/commandParser')
const telegramController = require('./lib/telegram/middleware/controller')
const DiscordReconciliation = require('./lib/discord/discordReconciliation')
const TelegramReconciliation = require('./lib/telegram/telegramReconciliation')
const PogoEventParser = require('./lib/pogoEventParser')
const scannerFactory = require('./lib/scanner/scannerFactory')
const ShinyPossible = require('./lib/shinyLoader')

const { Config } = require('./lib/configFetcher')
const GameData = require('./lib/GameData')

const {
	config, knex, scannerKnex, dts, geofence, translatorFactory,
} = Config()

const PoracleInfo = {}

const readDir = util.promisify(fs.readdir)

const telegraf = new Telegraf(config.telegram.token)// , { channelMode: true })
const telegrafChannel = config.telegram.channelToken ? new Telegraf(config.telegram.channelToken)/* , { channelMode: true }) */ : null

const scannerQuery = scannerFactory.createScanner(scannerKnex, config.database.scannerType)

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
const pogoEventParser = new PogoEventParser(logs.log)
const shinyPossible = new ShinyPossible(logs.log)

const gymCache = pcache.load('gymCache', path.join(__dirname, '../.cache'))

logs.setWorkerId('MAIN')
fastify.decorate('logger', logs.log)
fastify.decorate('controllerLog', logs.controller)
fastify.decorate('webhooks', logs.webhooks)
fastify.decorate('config', config)
fastify.decorate('knex', knex)
fastify.decorate('cache', cache)
fastify.decorate('gymCache', gymCache)
fastify.decorate('GameData', GameData)
fastify.decorate('query', query)
fastify.decorate('scannerQuery', scannerQuery)
fastify.decorate('dts', dts)
fastify.decorate('geofence', geofence)
fastify.decorate('translatorFactory', translatorFactory)
fastify.decorate('discordQueue', [])
fastify.decorate('telegramQueue', [])
fastify.decorate('hookQueue', [])

const discordCommando = config.discord.enabled ? new DiscordCommando(config.discord.token[0], query, scannerQuery, config, logs, GameData, PoracleInfo, dts, geofence, translatorFactory) : null
const discordWorkers = []
let discordWebhookWorker
let telegram
let telegramChannel

if (config.discord.enabled) {
	for (let key = 0; key < config.discord.token.length; key++) {
		if (config.discord.token[key]) {
			discordWorkers.push(new DiscordWorker(config.discord.token[key], key + 1, config, logs, true, (key
				? { status: config.discord.workerStatus || 'invisible', activity: config.discord.workerActivity ?? 'PoracleHelper' }
				: { status: 'available', activity: config.discord.activity ?? 'PoracleJS' }), query))
		}
	}
	fastify.decorate('discordWorker', discordWorkers[0])
	discordWebhookWorker = new DiscordWebhookWorker(config, logs, true, query)
}

if (config.telegram.enabled) {
	telegram = new TelegramWorker('1', config, logs, GameData, PoracleInfo, dts, geofence, telegramController, query, scannerQuery, telegraf, translatorFactory, telegramCommandParser, re, true)

	if (telegrafChannel) {
		telegramChannel = new TelegramWorker('2', config, logs, GameData, PoracleInfo, dts, geofence, telegramController, query, scannerQuery, telegrafChannel, translatorFactory, telegramCommandParser, re, true)
	}
}

let telegramReconciliation

async function syncTelegramMembership() {
	try {
		if (!telegramReconciliation) {
			telegramReconciliation = new TelegramReconciliation(telegraf, log, config, query, dts)
		}
		log.verbose('Verification of Telegram group membership for Poracle users starting...')

		if (config.reconciliation.telegram.updateUserNames || config.reconciliation.telegram.removeInvalidUsers) {
			await telegramReconciliation.syncTelegramUsers(
				config.reconciliation.discord.updateUserNames,
				config.reconciliation.discord.removeInvalidUsers,
			)
		}
		if (config.areaSecurity.enabled) {
			await telegramReconciliation.updateTelegramChannels()
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
			await discordReconciliation.syncDiscordChannels(
				config.reconciliation.discord.updateChannelNames,
				config.reconciliation.discord.updateChannelNotes,
				config.reconciliation.discord.unregisterMissingChannels,
			)
		}
		// "updateUserNames": true,
		// "removeInvalidUsers": true,
		// "registerNewUsers": true,
		if (config.reconciliation.discord.updateUserNames || config.reconciliation.discord.removeInvalidUsers || config.reconciliation.discord.registerNewUsers) {
			await discordReconciliation.syncDiscordRole(
				config.reconciliation.discord.registerNewUsers,
				config.reconciliation.discord.updateUserNames,
				config.reconciliation.discord.removeInvalidUsers,
			)
		}
	} catch (err) {
		log.error('Verification of Poracle user\'s roles failed with', err)
	}
	setTimeout(syncDiscordRole, config.discord.checkRoleInterval * 3600000)
}

function handleShutdown() {
	log.info('Poracle shutdown - starting save of cache')
	const workerSaves = []
	for (const worker of discordWorkers) {
		workerSaves.push(worker.saveTimeouts())
	}
	if (telegram) workerSaves.push(telegram.saveTimeouts())
	if (telegramChannel) workerSaves.push(telegramChannel.saveTimeouts())
	if (discordWebhookWorker) workerSaves.push(discordWebhookWorker.saveTimeouts())

	gymCache.save(true)
	Promise.all(workerSaves)
		.then(() => {
			log.info('Poracle shutdown - complete')
			process.exit()
		}).catch((err) => {
			log.error(`Poracle shutdown - Error saving files ${err}`)
			process.exit()
		})
}

const workers = []

async function processPogoEvents() {
	let file
	log.info('PogoEvents: Fetching new event file')

	try {
		file = await pogoEventParser.download()
	} catch (err) {
		log.error('PogoEvents: Cannot download pogo event file', err)
		setTimeout(processPogoEvents, 15 * 60 * 1000) // 15 mins
		return
	}

	for (const relayWorker of workers) {
		relayWorker.commandPort.postMessage(
			{
				type: 'eventBroadcast',
				data: file,
			},
		)
	}

	setTimeout(processPogoEvents, 6 * 60 * 60 * 1000) // 6 hours
}

async function processPossibleShiny() {
	let file
	log.info('ShinyPossible: Fetching new shiny file')

	try {
		file = await shinyPossible.download()
	} catch (err) {
		log.error('ShinyPossible: Cannot shiny file', err)
		setTimeout(processPossibleShiny, 15 * 60 * 1000) // 15 mins
		return
	}

	for (const relayWorker of workers) {
		relayWorker.commandPort.postMessage(
			{
				type: 'shinyBroadcast',
				data: file,
			},
		)
	}

	setTimeout(processPossibleShiny, 6 * 60 * 60 * 1000) // 6 hours
}

let ohbem
async function initialiseOhbem() {
	try {
		const pokemonData = await Ohbem.fetchPokemonData()

		ohbem = new Ohbem({
			// all of the following options are optional and these (except for pokemonData) are the default values
			// read the documentation for more information
			leagues: {
				little: {
					little: !config.pvp.littleLeagueCanEvolve,
					cap: 500,
				},
				great: 1500,
				ultra: 2500,
				//	master: null,
			},
			levelCaps: config.pvp.levelCaps,
			// The following field is required to use queryPvPRank
			// You can skip populating it if you only want to use other helper methods
			pokemonData,
			cachingStrategy: config.pvp.cacheStrategy === 'memoryheavy' ? Ohbem.cachingStrategies.memoryHeavy : Ohbem.cachingStrategies.balanced,
		})
	} catch (err) {
		log.error('Error initialising ohbem', err)
	}
}

const UserRateChecker = require('./userRateLimit')

const rateChecker = new UserRateChecker(config)

const maxWorkers = config.tuning.webhookProcessingWorkers

async function processMessages(msgs) {
	let newRateLimits = false

	for (const msg of msgs) {
		const destinationId = msg.type === 'webhook' ? msg.name : msg.target
		const destinationType = msg.type
		const rate = rateChecker.validateMessage(destinationId, destinationType)

		let queueMessage
		let logMessage = null
		let shameMessage = null

		if (!msg.alwaysSend && !rate.passMessage) {
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

						logMessage = `Stopped alerts (rate-limit exceeded too many times) for target ${destinationType} ${destinationId} ${msg.name} ${msg.type === 'discord:user' ? `<@${destinationId}>` : ''}`
						if (msg.type === 'discord:user') {
							shameMessage = userTranslator.translateFormat('<@{0}> has had their Poracle tracking disabled for exceeding the rate limit too many times!', destinationId)
						}

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
			if (shameMessage && config.alertLimits.shameChannel) {
				fastify.discordQueue.push({
					lat: 0,
					lon: 0,
					message: {
						content: shameMessage,
					},
					target: config.alertLimits.shameChannel,
					type: 'discord:channel',
					name: 'Shame channel',
					tth: { hours: 0, minutes: 0, seconds: 0 },
					clean: false,
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
	if (msg.type === 'weather') {
		weatherWorker.commandPort.postMessage(msg)
	}
	// No commands from controllers to stats, but would be relayed here
}

function sendCommandToWorkers(msg) {
	for (const relayWorker of workers) {
		relayWorker.commandPort.postMessage(msg)
	}
}

function sendCommandToWeather(msg) {
	weatherWorker.commandPort.postMessage(msg)
}

function processMessageFromWeather(msg) {
	// Relay broadcasts from weather to all controllers

	if (msg.type === 'weatherBroadcast') {
		PoracleInfo.lastWeatherBroadcast = msg.data

		sendCommandToWorkers(msg)
	}
}

function processMessageFromStats(msg) {
	// Relay broadcasts from stats to all controllers

	if (msg.type === 'statsBroadcast') {
		PoracleInfo.lastStatsBroadcast = msg.data

		sendCommandToWorkers(msg)
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
		const processHook = async (hookToProcess) => { await workers[currentWorkerNo].queuePort.postMessage(hookToProcess) }
		const processWeather = async (hookToProcess) => { await weatherWorker.queuePort.postMessage(hookToProcess) }
		const processStats = async (hookToProcess) => { await statsWorker.queuePort.postMessage(hookToProcess) }

		switch (hook.type) {
			case 'pokemon': {
				if (config.general.disablePokemon) {
					fastify.controllerLog.debug(`${hook.message.encounter_id}: Wild encounter was received but set to be ignored in config`)
					break
				}
				if (!hook.message.poracleTest && !config.tuning?.disablePokemonCache) {
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
				}

				if (ohbem) {
					const data = hook.message
					const encountered = !(!(['string', 'number'].includes(typeof data.individual_attack) && (+data.individual_attack + 1))
						|| !(['string', 'number'].includes(typeof data.individual_defense) && (+data.individual_defense + 1))
						|| !(['string', 'number'].includes(typeof data.individual_stamina) && (+data.individual_stamina + 1)))

					if (encountered) {
						try {
							const ohbemstart = process.hrtime()
							data.ohbem_pvp = ohbem.queryPvPRank(+data.pokemon_id, +data.form || 0, +data.costume, +data.gender, +data.individual_attack, +data.individual_defense, +data.individual_stamina, +data.pokemon_level)
							const ohbemend = process.hrtime(ohbemstart)
							const ohbemms = ohbemend[1] / 1000000
							fastify.controllerLog.debug(`${hook.message.encounter_id}: PVP time: ${ohbemms}ms`)
						} catch (err) {
							fastify.controllerLog.error(`${hook.message.encounter_id}: Ohbem exception - params ohbem.queryPvPRank(${+data.pokemon_id}, ${+data.form || 0}, ${+data.costume}, ${+data.gender}, ${+data.individual_attack}, ${+data.individual_defense}, ${+data.individual_stamina}, ${+data.pokemon_level}) - continuing`, err)
						}
					}
				}

				await processHook(hook)

				// also post directly to stats controller
				if (!hook.message.poracleTest) await processStats(hook)
				break
			}
			case 'raid': {
				if (config.general.disableRaid) {
					fastify.controllerLog.debug(`${hook.message.gym_id}: Raid was received but set to be ignored in config`)

					break
				}
				if (!hook.message.poracleTest) {
					fastify.webhooks.info(`raid ${JSON.stringify(hook.message)}`)
					const cacheKey = `${hook.message.gym_id}${hook.message.end}${hook.message.pokemon_id}`

					const raidDetails = fastify.cache.get(cacheKey)
					let rsvpDifference = false
					const oldRsvpsLen = raidDetails?.rsvps?.length ?? 0
					const newRsvpsLen = hook.message.rsvps?.length ?? 0
					if (newRsvpsLen > oldRsvpsLen) {
						rsvpDifference = true
					} else if (raidDetails && raidDetails.rsvps && hook.message.rsvps) {
						// Allow for old timeslots to have disappeared, so only compare the
						// new ones present
						for (let x = 0; x < newRsvpsLen; x++) {
							const newRsvp = hook.message.rsvps[x]

							let found = false
							for (const oldRsvp of raidDetails.rsvps) {
								if (newRsvp.timeslot === oldRsvp.timeslot) {
									found = true
									if (newRsvp.going_count !== oldRsvp.going_count
											|| newRsvp.maybe_count !== oldRsvp.maybe_count) {
										rsvpDifference = true
									}
									break
								}
							}

							if (found) {
								if (rsvpDifference) break
							} else {
								// timeslot was not in old rsvps
								rsvpDifference = true
								break
							}
						}
					}

					if (raidDetails && !rsvpDifference) {
						fastify.controllerLog.debug(`${hook.message.gym_id}: Raid was sent again too soon, ignoring`)
						break
					}

					hook.message.firstNotification = !raidDetails

					fastify.cache.set(cacheKey, {
						rsvps: hook.message.rsvps,
					})
				}

				await processHook(hook)
				break
			}
			case 'invasion':
			case 'pokestop': {
				if (config.general.disablePokestop) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Pokestop was received but set to be ignored in config`)
					break
				}
				fastify.webhooks.info(`pokestop(${hook.type}) ${JSON.stringify(hook.message)}`)
				const incidentExpiration = hook.message.incident_expiration ?? hook.message.incident_expire_timestamp
				const lureExpiration = hook.message.lure_expiration
				const incidentConfirmed = hook.message.confirmed
				const incidentDisplayType = hook.message.display_type
				if (!lureExpiration && !incidentExpiration) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Pokestop received but no invasion or lure information, ignoring`)
					break
				}

				if (lureExpiration && !config.general.disableLure) {
					const cacheKey = `${hook.message.pokestop_id}L${lureExpiration}`

					if (fastify.cache.get(cacheKey) && !hook.message.poracleTest) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Lure was sent again too soon, ignoring`)
					} else {
						// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
						const secondsRemaining = Math.max((lureExpiration * 1000 - Date.now()) / 1000, 0) + 300

						fastify.cache.set(cacheKey, 'x', secondsRemaining)
						hook.type = 'lure'
						await processHook(hook)
					}
				}

				if (incidentExpiration && !config.general.disableInvasion && (!config.general.disableUnconfirmedInvasion || incidentDisplayType > '6')) {
					const cacheKey = `${hook.message.pokestop_id}I${incidentExpiration}`

					if (fastify.cache.get(cacheKey) && !hook.message.poracleTest) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Invasion was sent again too soon, ignoring`)
					} else {
						// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
						const secondsRemaining = Math.max((incidentExpiration * 1000 - Date.now()) / 1000, 0) + 300

						fastify.cache.set(cacheKey, 'x', secondsRemaining)

						hook.type = 'invasion'
						await processHook(hook)
					}
				}

				if (incidentConfirmed && !config.general.disableInvasion && config.general.processConfirmedInvasionLineups) {
					const cacheKey = `${hook.message.pokestop_id}I${incidentExpiration}H02`

					if (fastify.cache.get(cacheKey) && !hook.message.poracleTest) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Invasion was sent again too soon, ignoring`)
					} else {
						// Set cache expiry to calculated invasion expiry time + 5 minutes to cope with near misses
						const secondsRemaining = Math.max((incidentExpiration * 1000 - Date.now()) / 1000, 0) + 300

						fastify.cache.set(cacheKey, 'x', secondsRemaining)

						hook.type = 'invasion'
						await processHook(hook)
					}
				}
				break
			}
			case 'fort_update': {
				const fortId = hook.message.new?.id ?? hook.message.old?.id
				if (config.general.disableFortUpdate) {
					fastify.controllerLog.debug(`${fortId}: Fort update was received but set to be ignored in config`)
					break
				}
				if (!hook.message.poracleTest) {
					fastify.webhooks.info(`fort_update ${JSON.stringify(hook.message)}`)
					// Caching not relevant, no duplicates
				}
				await processHook(hook)
				break
			}
			case 'quest': {
				if (config.general.disableQuest) {
					fastify.controllerLog.debug(`${hook.message.pokestop_id}: Quest was received but set to be ignored in config`)
					break
				}
				if (!hook.message.poracleTest) {
					fastify.webhooks.info(`quest ${JSON.stringify(hook.message)}`)
					const cacheKey = `${hook.message.pokestop_id}_${stringify(hook.message.rewards)}`

					if (fastify.cache.get(cacheKey)) {
						fastify.controllerLog.debug(`${hook.message.pokestop_id}: Quest was sent again too soon, ignoring`)
						break
					}
					fastify.cache.set(cacheKey, 'x')
				}
				await processHook(hook)
				break
			}
			case 'gym':
			case 'gym_details': {
				if (!hook.message.poracleTest) {
					const id = hook.message.id ?? hook.message.gym_id
					const team = hook.message.team_id ?? hook.message.team
					const inBattle = hook.message.is_in_battle ?? hook.message.in_battle ?? 0

					if (config.general.disableGym) {
						fastify.controllerLog.debug(`${id}: Gym was received but set to be ignored in config`)
						break
					}
					fastify.webhooks.info(`gym(${hook.type})  ${JSON.stringify(hook.message)}`)

					const cacheKey = `${id}_battle`
					const cachedGymDetails = fastify.gymCache.getKey(id)
					const tooSoon = fastify.cache.get(cacheKey)

					if (inBattle) {
						fastify.cache.set(cacheKey, 'x', 5 * 60)
					}

					if (cachedGymDetails && cachedGymDetails.team_id === team && cachedGymDetails.slots_available === hook.message.slots_available && tooSoon) {
						fastify.controllerLog.debug(`${id}: Gym battle cooldown time hasn't ended, ignoring`)
						break
					}

					hook.message.old_team_id = cachedGymDetails ? cachedGymDetails.team_id : -1
					hook.message.old_slots_available = cachedGymDetails ? cachedGymDetails.slots_available : -1
					hook.message.old_in_battle = cachedGymDetails ? cachedGymDetails.in_battle : -1
					hook.message.last_owner_id = cachedGymDetails ? cachedGymDetails.last_owner_id : -1

					fastify.gymCache.setKey(id, {
						team_id: team,
						slots_available: hook.message.slots_available,
						last_owner_id: team || hook.message.last_owner_id,
						in_battle: inBattle,
					}, 0)
				}

				await processHook(hook)
				break
			}

			case 'nest': {
				if (config.general.disableNest) {
					fastify.controllerLog.debug(`${hook.message.nest_id}: Nest was received but set to be ignored in config`)
					break
				}
				if (!hook.message.poracleTest) {
					fastify.webhooks.info(`nest ${JSON.stringify(hook.message)}`)
					const cacheKey = `${hook.message.nest_id}_${hook.message.pokemon_id}_${hook.message.reset_time}`
					if (fastify.cache.get(cacheKey)) {
						fastify.controllerLog.debug(`${hook.message.nest_id}: Nest was sent again too soon, ignoring`)
						break
					}

					// expiry time -- 14 days (!) after reset time
					const secondsRemaining = Math.max(((hook.message.reset_time + 14 * 24 * 60 * 60) * 1000 - Date.now()) / 1000, 0)

					fastify.cache.set(cacheKey, 'x', secondsRemaining)
				}
				await processHook(hook)
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
				await processWeather(hook)
				break
			}
			default:
				fastify.webhooks.info(`${hook.type} [unrecognised] ${JSON.stringify(hook.message)}`)
				break
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

	// eslint-disable-next-line no-sequences
	const queueCount = (queue) => queue.map((x) => x.target).reduce((r, c) => (r[c] = (r[c] || 0) + 1, r), {})

	const queueSummary = {}

	for (const w of discordWorkers) {
		discordQueueLength += w.discordQueue.length
		Object.assign(queueSummary, queueCount(w.discordQueue))
	}

	const telegramQueueLength = (telegram ? telegram.telegramQueue.length : 0)
		+ (telegramChannel ? telegramChannel.telegramQueue.length : 0)

	const webhookQueueLength = discordWebhookWorker ? discordWebhookWorker.webhookQueue.length : 0
	Object.assign(
		queueSummary,
		telegram ? queueCount(telegram.telegramQueue) : {},
		telegramChannel ? queueCount(telegramChannel.telegramQueue) : {},
		discordWebhookWorker ? queueCount(discordWebhookWorker.webhookQueue) : {},
	)

	const infoMessage = `[Main] Queues: Inbound webhook ${fastify.hookQueue.length} | Discord: ${discordQueueLength} + ${webhookQueueLength} | Telegram: ${telegramQueueLength}`
	log.info(infoMessage)
	const cacheMessage = `Duplicate cache stats: ${JSON.stringify(fastify.cache.getStats())}`
	log.verbose(cacheMessage)

	PoracleInfo.status = {
		queueInfo: infoMessage,
		cacheInfo: cacheMessage,
		queueSummary,
	}
}

schedule.scheduleJob({ minute: [0, 10, 20, 30, 40, 50] }, async () => {			// Run every 10 minutes - note if this changes then check below also needs to change
	try {
		log.verbose('Profile Check: Checking for active profile changes')
		const humans = await query.selectAllQuery('humans', { enabled: 1, admin_disable: 0 })
		const profilesToCheck = await query.mysteryQuery('SELECT * FROM profiles WHERE LENGTH(active_hours)>5 ORDER BY id, profile_no')

		let lastId = null
		for (const profile of profilesToCheck) {
			const human = humans.find((x) => x.id === profile.id)

			// eslint-disable-next-line no-continue
			if (!human) continue

			let nowForHuman = moment()
			if (human.latitude) {
				nowForHuman = moment().tz(geoTz.find(human.latitude, human.longitude)[0].toString())
			}

			if (profile.id !== lastId) {
				const timings = JSON.parse(profile.active_hours)
				const nowHour = nowForHuman.hour()
				const nowMinutes = nowForHuman.minutes()
				const nowDow = nowForHuman.isoWeekday()
				const yesterdayDow = +nowDow === 1 ? 7 : nowDow - 1

				const active = timings.some((row) => {
					const rowHours = +row.hours
					const rowMins = +row.mins
					const rowDay = +row.day

					return (rowDay === nowDow && rowHours === nowHour && nowMinutes >= row.mins && (nowMinutes - rowMins) < 10) // within 10 minutes in same hour
						|| (nowMinutes < 10 && rowDay === nowDow && rowHours === nowHour - 1 && rowMins > 50) // first 10 minutes of new hour
						|| (nowHour === 0 && nowMinutes < 10 && rowDay === yesterdayDow && rowHours === 23 && rowMins > 50) // first 10 minutes of day
				})

				if (active) {
					if (human.current_profile_no !== profile.profile_no) {
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
						await query.updateQuery(
							'humans',
							{
								current_profile_no: profile.profile_no,
								area: profile.area,
								latitude: profile.latitude,
								longitude: profile.longitude,
							},
							{ id: profile.id },
						)
					}
				}
			}
		}
	} catch (err) {
		log.error('Error setting profiles', err)
	}
})

async function run() {
	process.on('SIGINT', handleShutdown)
	process.on('SIGTERM', handleShutdown)

	if (config.pvp.dataSource === 'internal' || config.pvp.dataSource === 'compare') {
		initialiseOhbem()
	}

	setTimeout(processPogoEvents, 30000)
	setTimeout(processPossibleShiny, 30000)

	let watchGeofence = Array.isArray(config.geofence.path)
		? config.geofence.path
		: [config.geofence.path]
	watchGeofence = watchGeofence.map((x) => (x.startsWith('http')
		? path.join(__dirname, '../.cache', `${x.replace(/\//g, '__')}.json`)
		: path.join(__dirname, `../${x}`)))

	chokidar.watch(watchGeofence, {
		awaitWriteFinish: true,
	}).on('change', () => {
		log.info('Change in geofence detected, triggering reload')
		try {
			sendCommandToWorkers({
				type: 'reloadGeofence',
			})
			sendCommandToWeather({
				type: 'reloadGeofence',
			})

			// This splice mechanism replaces array in place (relies on no caching)
			const newGeofence = require('./lib/geofenceLoader').readAllGeofenceFiles(config)
			geofence.rbush = newGeofence.rbush
			geofence.geofence = newGeofence.geofence
		} catch (err) {
			log.error('Error reloading dts', err)
		}
	})

	chokidar.watch([
		path.join(__dirname, '../config/dts.json'),
		path.join(__dirname, '../config/dts/'),
	], {
		awaitWriteFinish: true,
	}).on('change', () => {
		log.info('Change in DTS detected, triggering reload')
		try {
			sendCommandToWorkers({
				type: 'reloadDts',
			})
			sendCommandToWeather({
				type: 'reloadDts',
			})

			// This splice mechanism replaces array in place (relies on no caching)
			const newDts = require('./lib/dtsloader').readDtsFiles()
			dts.splice(0, dts.length, ...newDts)
		} catch (err) {
			log.error('Error reloading dts', err)
		}
	})

	if (config.discord.enabled) {
		try {
			log.info('Starting discord workers')

			await discordCommando.start()
			for (const discordWorker of discordWorkers) {
				await discordWorker.start()
			}
			await discordWebhookWorker.start()

			fastify.decorate('discordClient', discordWorkers[0].client)
		} catch (err) {
			log.error('Error starting discord workers', err)
		}

		setInterval(() => {
			if (!fastify.discordQueue.length) {
				return
			}

			// Dequeue onto individual queues as fast as possible
			while (fastify.discordQueue.length) {
				const { target, type } = fastify.discordQueue[0]
				let discordWorker
				if (type === 'webhook') {
					discordWorker = discordWebhookWorker
				} else {
					// see if target has dedicated worker
					discordWorker = discordWorkers.find((workerr) => workerr.users.includes(target))
					if (!discordWorker) {
						let busyestWorkerHumanCount = Number.POSITIVE_INFINITY
						let laziestWorkerId
						Object.keys(discordWorkers).map((i) => {
							if (discordWorkers[i].userCount < busyestWorkerHumanCount) {
								busyestWorkerHumanCount = discordWorkers[i].userCount
								laziestWorkerId = i
							}
						})
						busyestWorkerHumanCount = Number.POSITIVE_INFINITY
						discordWorker = discordWorkers[laziestWorkerId]
						discordWorker.addUser(target)
					}
				}

				discordWorker.work(fastify.discordQueue.shift())
			}
		}, 100)

		if (config.discord.checkRole && config.discord.checkRoleInterval && config.discord.guilds) {
			setTimeout(syncDiscordRole, 10000)
		}

		discordCommando.on('sendMessages', (res) => {
			processMessages(res)
		})

		discordCommando.on('addWebhook', (res) => {
			processOne(res)
		})

		discordCommando.on('refreshAlertCache', () => {
			sendCommandToWorkers({
				type: 'refreshAlertCache',
			})
		})
	}

	if (config.telegram.enabled) {
		try {
			log.info('Starting telegram workers')

			await telegram.start()
			if (telegramChannel) await telegramChannel.start()
		} catch (err) {
			log.error('Error starting discord workers', err)
		}
		setInterval(() => {
			if (!fastify.telegramQueue.length) {
				return
			}

			while (fastify.telegramQueue.length) {
				let telegramWorker = telegram
				if (telegramChannel && ['telegram:channel', 'telegram:group'].includes(fastify.telegramQueue[0].type)) {
					telegramWorker = telegramChannel
				}

				telegramWorker.work(fastify.telegramQueue.shift())
			}
		}, 100)

		if (config.telegram.checkRole && config.telegram.checkRoleInterval) {
			setTimeout(syncTelegramMembership, 30000)
		}

		telegram.on('sendMessages', (res) => {
			processMessages(res)
		})

		telegram.on('addWebhook', (res) => {
			processOne(res)
		})

		telegram.on('refreshAlertCache', () => {
			sendCommandToWorkers({
				type: 'refreshAlertCache',
			})
		})
	}

	fastify.decorate('triggerReloadAlerts', () => {
		sendCommandToWorkers({
			type: 'refreshAlertCache',
		})
	})

	const routeFiles = await readDir(`${__dirname}/routes/`)
	const routes = routeFiles.map((fileName) => `${__dirname}/routes/${fileName}`)

	routes.forEach((route) => fastify.register(require(route)))
	await fastify.listen({
		port: config.server.port,
		host: config.server.host,
	})
	log.info(`Service started on ${fastify.server.address().address}:${fastify.server.address().port}`)
}

function startPoracle() {
	run()
	setInterval(handleAlarms, 100)
	setInterval(currentStatus, 60000)
}

const NODE_MAJOR_VERSION = process.versions.node.split('.')[0]
if (NODE_MAJOR_VERSION < 16) {
	log.warn('PoracleJS requires Node 16 - please upgrade')
	process.exit(1)
}

knex.migrate.latest({
	directory: path.join(__dirname, './lib/db/migrations'),
	tableName: 'migrations',
}).then(() => {
	startPoracle()
}).catch((err) => {
	// eslint-disable-next-line no-console
	console.error(err)

	log.error('Migration failed', err)

	if (process.argv.includes('--force')) {
		startPoracle()
	} else {
		// eslint-disable-next-line no-console
		console.error('Migration failed - exiting PoracleJS')

		process.exit(1)
	}
})
