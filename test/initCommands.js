const Enmap = require('enmap')
const fs = require('fs')
const { S2 } = require('s2-geometry')
const mustache = require('handlebars')
const emojiStrip = require('emoji-strip')
const hastebin = require('hastebin-gen')

const { knex, config } = require('../src/lib/configFetcher')()
require('../src/lib/configFileCreator')()
const monsterData = require('../src/util/monsters')
const geofence = require('../config/geofence.json')
const dts = require('../config/dts.json')
const Controller = require('../src/controllers/controller')
const { log } = require('../src/lib/logger')


const utilData = require('../src/util/util')
const Translator = require('../src/util/translate')
const translator = new Translator()

const query = new Controller(knex, config)

const FakeDiscord = require('./FakeDiscord')
const re = require('../src/util/regex')(translator)


const client = new FakeDiscord()
// We also need to make sure we're attaching the config to the CLIENT so it's accessible everywhere!
client.config = config
client.S2 = S2
client.query = query
client.emojiStrip = emojiStrip
client.log = log
client.dts = dts
client.re = re
client.geofence = geofence
client.monsters = monsterData
client.utilData = utilData
client.mustache = mustache
client.hastebin = hastebin
client.translator = translator
client.hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

fs.readdir(`${__dirname}/../src/lib/discord/commando/events/`, (err, files) => {
	if (err) return log.error(err)
	files.forEach((file) => {
		const event = require(`${__dirname}/../src/lib/discord/commando/events/${file}`) // eslint-disable-line global-require
		const eventName = file.split('.')[0]
		client.on(eventName, event.bind(null, client))
	})
})

client.commands = new Enmap()
const enabledCommands = []
fs.readdir(`${__dirname}/../src/lib/discord/commando/commands/`, (err, files) => {
	if (err) return log.error(err)
	files.forEach((file) => {
		if (!file.endsWith('.js')) return
		const props = require(`${__dirname}/../src/lib/discord/commando/commands/${file}`) // eslint-disable-line global-require
		const commandName = file.split('.')[0]
		enabledCommands.push(`${config.discord.prefix}${commandName}`)
		client.commands.set(commandName, props)
	})


	log.log({ level: 'debug', message: `Loading discord commands: (${enabledCommands.join(' ')})`, event: 'discord:commandsAdded' })
})


module.exports = client
