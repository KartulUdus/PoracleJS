module.exports = (knex, config, log, monsterData, utilData, dts, geofence, translator) => {
	const Controller = require('../../../controllers/controller')
	const query = new Controller(knex, config)

	const re = require('../../../util/regex')(translator)

	const { Client } = require('discord.js')
	const Enmap = require('enmap')
	const fs = require('fs')
	const { S2 } = require('s2-geometry')
	const mustache = require('handlebars')
	const emojiStrip = require('emoji-strip')
	const hastebin = require('hastebin-gen')

	const client = new Client()
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

	fs.readdir(`${__dirname}/events/`, (err, files) => {
		if (err) return log.error(err)
		files.forEach((file) => {
			const event = require(`${__dirname}/events/${file}`) // eslint-disable-line global-require
			const eventName = file.split('.')[0]
			client.on(eventName, event.bind(null, client))
		})
	})

	client.commands = new Enmap()
	const enabledCommands = []
	fs.readdir(`${__dirname}/commands/`, (err, files) => {
		if (err) return log.error(err)
		files.forEach((file) => {
			if (!file.endsWith('.js')) return
			const props = require(`${__dirname}/commands/${file}`) // eslint-disable-line global-require
			const commandName = file.split('.')[0]
			enabledCommands.push(`${config.discord.prefix}${commandName}`)
			client.commands.set(commandName, props)
		})


		log.log({ level: 'debug', message: `Loading discord commands: (${enabledCommands.join(' ')})`, event: 'discord:commandsAdded' })
	})
	client.login(client.config.discord.token[0])
}
