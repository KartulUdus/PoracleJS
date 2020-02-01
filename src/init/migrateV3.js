const Knex = require('knex')
const config = require('config')
const path = require('path')
const reader = require('readline-sync')
const { log } = require('../lib/logger')

const hookRegex = new RegExp('(?:(?:https?):\\/\\/|www\\.)(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[-A-Z0-9+&@#\\/%=~_|$?!:,.])*(?:\\([-A-Z0-9+&@#\\/%=~_|$?!:,.]*\\)|[A-Z0-9+&@#\\/%=~_|$])', 'igm')


function getNewKnex() {
	switch (config.database.client) {
		case 'mysql': {
			return Knex({
				client: 'mysql2',
				connection: config.database.conn,
				pool: { min: 2, max: 10 },
			})
		}

		case 'pg': {
			return Knex({
				client: 'pg',
				version: '7.11',
				connection: config.database.conn,
				pool: { min: 2, max: 10 },
			})
		}
		default: {
			return Knex({
				client: 'sqlite3',
				useNullAsDefault: true,
				connection: {
					filename: path.join(__dirname, '../lib/db/poracle.sqlite'),
				},
			})
		}
	}
}

function getOldKnex(host, port, database, user, password) {
	return Knex({
		client: 'mysql2',
		connection: {
			host,
			port,
			database,
			user,
			password,
		},
		pool: { min: 2, max: 10 },
	})
}

function getDbCreds() {
	let confirmV3 = false
	let host
	let port
	let database
	let user
	let pw

	while (!confirmV3) {
		host = reader.question('Please enter your v3 database host: ')
		port = reader.question('Please enter your v3 database port: ')
		database = reader.question('please enter your v3 database name: ')
		user = reader.question('please enter your v3 database username: ')
		pw = reader.question('please enter your v3 database password: ')

		log.info(JSON.stringify({
			host, port, database, user, pw,
		}, null, 4))
		const confirmation = reader.question('Are the details ☝️ correct for your OLD database? (Y/N)')

		if (['y', 'yes', 'affirmative', 'yep'].includes(confirmation.toLowerCase())) confirmV3 = true
	}

	log.info(JSON.stringify(config.database.conn, null, 4))
	const confirmV4 = reader.question('Are the details ☝️ correct for your NEW v4 database? (Y/N)')
	if (!['y', 'yes', 'affirmative', 'yep'].includes(confirmV4.toLowerCase())) return log.warn('Please edit your config files to match your new database')

	return {
		oldDb: getOldKnex({
			host, port, database, user, pw,
		}),
		newDb: getNewKnex(),
	}
}

async function run() {
	try {
		const { oldDb, newDb } = getDbCreds()
		const humans = oldDb.select('*').from('humans')
		const monsters = oldDb.select('*').from('monsters')
		const invasions = oldDb.select('*').from('incident')
		const raids = oldDb.select('*').from('raid')
		const quests = oldDb.select('*').from('quest')
		const eggs = oldDb.select('*').from('egg')
		newDb.migrate.latest({
			directory: path.join(__dirname, '../lib/db/migrations'),
			tableName: 'migrations',
		})

		for (const human of humans) {
			if (human.id.toString().length < 17) {
				if (+human.id < 0) {
					human.type = 'telegram:user'
				} else {
					human.type = 'telegram:channel'
				}
			} else if (human.id.math(hookRegex)) {
				human.type = 'webhook'
			} else {
				if (+human.id.toString().charAt(0) > 2) human.type = 'discord:channel'
				if (+human.id.toString().charAt(0) < 3) human.type = 'discord:user'
			}
			human.last_checked = new Date()
			human.fails = 0
		}
		for (const monster of monsters) {
			monster.ping = ''
			monster.clean = false
		}

		for (const raid of raids) {
			raid.ping = ''
			raid.clean = false
		}

		for (const invasion of invasions) {
			invasion.ping = ''
			invasion.clean = false
		}
		for (const quest of quests) {
			quest.ping = ''
			quest.clean = false
		}

		for (const egg of eggs) {
			egg.ping = ''
			egg.clean = false
		}

		await newDb.insert(humans).into('humans')
		await newDb.insert(monsters).into('monsters')
		await newDb.insert(raids).into('raid')
		await newDb.insert(monsters).into('quest')
		await newDb.insert(eggs).into('egg')
		await newDb.insert(invasions).into('invasion') // might not work yet, sue me

		log.info('seems to have worked, check above for nasty bad stuff')
	} catch {
		log.error('something was unhappy, check logs pls')
	}
}

run()
