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

function getOldKnex(creds) {
	return Knex({
		client: 'mysql2',
		connection: {
			host: creds.host,
			database: creds.database,
			user: creds.user,
			password: creds.password,
			port: creds.port,
		},
		pool: { min: 2, max: 10 },
	})
}

function snakeCaseKeys(sentList) {
	const list = sentList
	for (const key in list) {
		if (Object.prototype.hasOwnProperty.call(list, key)) {
			list[key.replace(/([A-Z])/g, '_$1').toLowerCase()] = list[key]
			delete list[key]
		}
	}
	return list.filter((a) => a)
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
		database = reader.question('please enter your v3 database name: ')
		user = reader.question('please enter your v3 database username: ')
		pw = reader.question('please enter your v3 database password: ')
		port = reader.question('Please enter your v3 database port: ')

		log.info(JSON.stringify({
			host, port, database, user, pw,
		}, null, 4))
		const confirmation = reader.question('Are the details ☝️ correct for your OLD database? (Y/N)')

		if (['y', 'yes', 'affirmative', 'yep'].includes(confirmation.toLowerCase())) confirmV3 = true
	}

	log.info(JSON.stringify(config.database, null, 4))
	const confirmV4 = reader.question('Are the details ☝️ correct for your NEW v4 database? (Y/N)')
	if (!['y', 'yes', 'affirmative', 'yep'].includes(confirmV4.toLowerCase())) return log.warn('Please edit your config files to match your new database')

	return {
		oldDb: getOldKnex({
			host, database, user, password: pw, port: +port,
		}),
		newDb: getNewKnex(),
	}
}

async function run() {
	try {
		const { oldDb, newDb } = getDbCreds()
		const humans = await oldDb.select('*').from('humans')
		let monsters = await oldDb.select('*').from('monsters')
		let invasions = await oldDb.select('*').from('incident')
		let raids = await oldDb.select('*').from('raid')
		let quests = await oldDb.select('*').from('quest')
		let eggs = await oldDb.select('*').from('egg')

		await newDb.migrate.latest({
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
			} else if (human.id.match(hookRegex)) {
				human.type = 'webhook'
			} else {
				if (+human.id.toString().charAt(0) > 2) human.type = 'discord:channel'
				if (+human.id.toString().charAt(0) < 3) human.type = 'discord:user'
			}
			human.last_checked = new Date()
			human.fails = 0
			delete human.alerts_sent
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


		monsters = snakeCaseKeys(monsters)
		invasions = snakeCaseKeys(invasions)
		raids = snakeCaseKeys(raids)
		quests = snakeCaseKeys(quests)
		eggs = snakeCaseKeys(eggs)

		const humanSlices = humans.map((e, i) => (i % 25 === 0 ? humans.slice(i, i + 25) : null)).filter((e) => e)
		const monsterSlices = monsters.map((e, i) => (i % 25 === 0 ? monsters.slice(i, i + 25) : null)).filter((e) => e)
		const invasionSlices = invasions.map((e, i) => (i % 25 === 0 ? invasions.slice(i, i + 25) : null)).filter((e) => e)
		const raidsSlices = raids.map((e, i) => (i % 25 === 0 ? raids.slice(i, i + 25) : null)).filter((e) => e)
		const questSlices = quests.map((e, i) => (i % 25 === 0 ? quests.slice(i, i + 25) : null)).filter((e) => e)
		const eggSlices = eggs.map((e, i) => (i % 25 === 0 ? eggs.slice(i, i + 25) : null)).filter((e) => e)


		for (const h of humanSlices) {
			await newDb.insert(h).into('humans')
		}
		for (const m of monsterSlices) {
			await newDb.insert(m).into('monsters')
		}
		for (const i of invasionSlices) {
			await newDb.insert(i).into('invasion')
		}
		for (const r of raidsSlices) {
			await newDb.insert(r).into('raid')
		}
		for (const q of questSlices) {
			await newDb.insert(q).into('quest')
		}
		for (const e of eggSlices) {
			await newDb.insert(e).into('egg')
		}

		log.info(`Updated ${humans.length} humans, ${monsters.length} monsters, ${invasions.length} invasions, ${raids.length} raids and ${eggs.length} eggs `)

		process.exit(1)
	} catch (e) {
		log.error('something was unhappy: ', e)
	}
}

run()
