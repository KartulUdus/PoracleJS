const importFresh = require('import-fresh')
const path = require('path')
const Knex = require('knex')
const Translator = require('../util/translate')

let config
let knex
let dts
let geofence
let translator

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
		geofence = importFresh(path.join(__dirname, `../../${config.geofence.path}`))
		if (geofence.type === 'FeatureCollection') geofence = getGeofenceFromGEOjson(path.join(__dirname, `../../${config.geofence.path}`))
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
