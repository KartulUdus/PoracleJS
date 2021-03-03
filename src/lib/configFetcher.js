const importFresh = require('import-fresh')
const path = require('path')
const Knex = require('knex')
const moment = require('moment-timezone')
const TranslatorFactory = require('../util/translatorFactory')
const dtsLoader = require('./dtsloader')
const configChecker = require('./configChecker')

let config
let knex
let dts
let geofence
let translator
let translatorFactory

function getGeofenceFromGEOjson(file) {
	const rawdata = importFresh(file)
	if (rawdata.type !== 'FeatureCollection' || !rawdata.features) return
	const geofenceGEOjson = rawdata.features
	const outGeofence = []
	for (let i = 0; i < geofenceGEOjson.length; i++) {
		if (geofenceGEOjson[i].type === 'Feature' && geofenceGEOjson[i].geometry.type === 'Polygon') {
			const name = geofenceGEOjson[i].properties.name || config.defaultGeofenceName + i.toString()
			const color = geofenceGEOjson[i].properties.color || config.defaultGeofenceColor
			outGeofence[i] = {
				name, id: i, color, path: [],
			}
			geofenceGEOjson[i].geometry.coordinates[0].forEach((coordinates) => outGeofence[i].path.push([coordinates[1], coordinates[0]]))
		}
	}
	return outGeofence
}
function getKnex(conf) {
	switch (conf.database.client) {
		case 'mysql': {
			return Knex({
				client: 'mysql2',
				connection: conf.database.conn,
				pool: { min: 2, max: conf.tuning.maxDatabaseConnections },
			})
		}

		case 'pg': {
			return Knex({
				client: 'pg',
				connection: conf.database.conn,
				pool: { min: 2, max: conf.tuning.maxDatabaseConnections },
			})
		}
		default: {
			throw new Error('Sqlite is no longer supported, move to MYSQL or get latest which worked: git checkout 4350c45bf63ce1bc6c341f3a0b921238b106f1d6 - come to discord for help')

			// return Knex({
			// 	client: 'sqlite3',
			// 	useNullAsDefault: true,
			// 	connection: {
			// 		filename: path.join(__dirname, './db/poracle.sqlite'),
			// 	},
			// })
		}
	}
}

module.exports = {
	Config: (performChecks = true) => {
		config = importFresh('config')
		dts = dtsLoader.readDtsFiles()
		geofence = importFresh(path.join(__dirname, `../../${config.geofence.path}`))
		if (geofence.type === 'FeatureCollection') geofence = getGeofenceFromGEOjson(path.join(__dirname, `../../${config.geofence.path}`))
		knex = getKnex(config)
		translatorFactory = new TranslatorFactory(config)
		translator = translatorFactory.default

		if (performChecks) {
		knex.migrate.latest({
			directory: path.join(__dirname, './db/migrations'),
			tableName: 'migrations',
		})
			configChecker.checkConfig(config)
			configChecker.checkDts(dts, config)
			configChecker.checkGeofence(geofence)
		}

		moment.locale(config.locale.timeformat)
		return {
			config, knex, dts, geofence, translator, translatorFactory,
		}
	},
	getKnex,
}
