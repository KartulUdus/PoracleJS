const cluster = require('cluster')
const { Client } = require('discord.js')
const Enmap = require('enmap')
const fs = require('fs')
const config = require('config')
const mysql = require('mysql2/promise')


const db = mysql.createPool(config.db)
const Controller = require('../controllers/controller')

const query = new Controller(db)
const dts = require('../../config/dts')
const log = require('../logger')

if (cluster.isMaster) {
	cluster.fork()
	cluster.on('exit', (deadWorker, code, signal) => {
		// Restart the worker
		const worker = cluster.fork()
		const newID = worker.id
		const oldID = deadWorker.id
		log.warn(`Discord commando #${oldID} died, long live commando #${newID}`)
	})
}
else {
	const client = new Client()
	// We also need to make sure we're attaching the config to the CLIENT so it's accessible everywhere!
	client.config = config
	client.query = query
	client.dts = dts
	client.log = log
	client.hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')

	fs.readdir(`${__dirname}/commando/events/`, (err, files) => {
		if (err) return log.error(err)
		files.forEach((file) => {
			const event = require(`${__dirname}/commando/events/${file}`) // eslint-disable-line global-require
			const eventName = file.split('.')[0]
			client.on(eventName, event.bind(null, client))
		})
	})

	client.commands = new Enmap()
	const enabledCommands = []
	fs.readdir(`${__dirname}/commando/commands/`, (err, files) => {
		if (err) return log.error(err)
		files.forEach((file) => {
			if (!file.endsWith('.js')) return
			const props = require(`${__dirname}/commando/commands/${file}`) // eslint-disable-line global-require
			const commandName = file.split('.')[0]
			enabledCommands.push(`${config.discord.prefix}${file.split('.')[0]}`)
			client.commands.set(commandName, props)
		})
		log.log({ level: 'debug', message: `Loading discord commands: (${enabledCommands.join(' ')})`, event: 'discord:commandsAdded' })
	})

	client.login(config.discord.token[0])
		.catch((err) => {
			log.error(`Discord commando unhappy: ${err.message}`)
			process.exit()
		})
}
