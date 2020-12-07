const importFresh = require('import-fresh')
const path = require('path')
const Knex = require('knex')
const Translator = require('../util/translate')

let config
let knex
let dts
let geofence
let translator

function getKnex(conf) {
	switch (conf.database.client) {
		case 'mysql': {
			return Knex({
				client: 'mysql2',
				connection: conf.database.conn,
				pool: { min: 2, max: 10 },
			})
		}

		case 'pg': {
			return Knex({
				client: 'pg',
				connection: conf.database.conn,
				pool: { min: 2, max: 10 },
			})
		}
		default: {
			return Knex({
				client: 'sqlite3',
				useNullAsDefault: true,
				connection: {
					filename: path.join(__dirname, './db/poracle.sqlite'),
				},
			})
		}
	}
}

module.exports = {
	Config: () => {
		config = importFresh('config')
		dts = importFresh(path.join(__dirname, '../../config/dts.json'))
		geofence = importFresh(path.join(__dirname, '../../config/geofence.json'))
		knex = getKnex(config)
		knex.migrate.latest({
			directory: path.join(__dirname, './db/migrations'),
			tableName: 'migrations',
		})
		translator = new Translator(config.general.locale)
		return {
			config, knex, dts, geofence, translator,
		}
	},
	getKnex,

}