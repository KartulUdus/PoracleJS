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
let scannerKnex

function getGeofenceFromGEOjson(file) {
	const rawdata = importFresh(file)
	if (rawdata.type !== 'FeatureCollection' || !rawdata.features) return
	const geofenceGEOjson = rawdata.features
	const outGeofence = []
	for (let i = 0; i < geofenceGEOjson.length; i++) {
		if (geofenceGEOjson[i].type === 'Feature' && geofenceGEOjson[i].geometry.type === 'Polygon') {
			const { properties } = geofenceGEOjson[i]
			const name = properties.name || config.defaultGeofenceName + i.toString()
			const color = properties.color || config.defaultGeofenceColor

			outGeofence[i] = {
				name,
				id: i,
				color,
				path: [],
				group: properties.group || '',
				description: properties.description || '',
				userSelectable: properties.userSelectable === undefined || properties.userSelectable,
				displayInMatches: properties.displayInMatches === undefined || properties.displayInMatches,
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
				pool: { min: 0, max: conf.tuning.maxDatabaseConnections },
			})
		}

		case 'pg': {
			throw new Error('Postgresql may be still supported but we don\'t test against it  - come to discord for help')

			// return Knex({
			// 	client: 'pg',
			// 	connection: conf.database.conn,
			// 	pool: { min: 2, max: conf.tuning.maxDatabaseConnections },
			// })
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

function getScannerKnex(conf) {
	if (conf.database.scannerType === 'mad' || conf.database.scannerType === 'rdm') {
		return Knex({
			client: 'mysql2',
			connection: conf.database.scanner,
			pool: { min: 0, max: conf.tuning.maxDatabaseConnections },
		})
	}

	return null
}

module.exports = {
	Config: (performChecks = true) => {
		config = importFresh('config')
		dts = dtsLoader.readDtsFiles()
		geofence = importFresh(path.join(__dirname, `../../${config.geofence.path}`))
		if (geofence.type === 'FeatureCollection') geofence = getGeofenceFromGEOjson(path.join(__dirname, `../../${config.geofence.path}`))
		knex = getKnex(config)
		scannerKnex = getScannerKnex(config)
		translatorFactory = new TranslatorFactory(config)
		translator = translatorFactory.default

		if (performChecks) {
			configChecker.checkConfig(config)
			configChecker.checkDts(dts, config)
			configChecker.checkGeofence(geofence)
		}

		moment.locale(config.locale.timeformat)
		return {
			config, knex, scannerKnex, dts, geofence, translator, translatorFactory,
		}
	},
	getKnex,
}
