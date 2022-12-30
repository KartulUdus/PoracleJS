const stripJsonComments = require('strip-json-comments')
const fs = require('fs')
const path = require('path')
const { log } = require('./logger')

function getGeofenceFromGEOjson(config, rawdata) {
	if (rawdata.type !== 'FeatureCollection' || !rawdata.features) return
	const geofenceGEOjson = rawdata.features
	const outGeofence = []
	for (let i = 0; i < geofenceGEOjson.length; i++) {
		if (geofenceGEOjson[i].type === 'Feature' && geofenceGEOjson[i].geometry.type === 'Polygon') {
			const { properties } = geofenceGEOjson[i]
			const name = properties.name || config.defaultGeofenceName + i.toString()
			const color = properties.color || config.defaultGeofenceColor

			const newFence = {
				name,
				id: i,
				color,
				path: [],
				group: properties.group || '',
				description: properties.description || '',
				userSelectable: !!(properties.userSelectable ?? true),
				displayInMatches: !!(properties.displayInMatches ?? true),
			}
			geofenceGEOjson[i].geometry.coordinates[0].forEach((coordinates) => newFence.path.push([coordinates[1], coordinates[0]]))

			outGeofence.push(newFence)
		}
		if (geofenceGEOjson[i].type === 'Feature' && geofenceGEOjson[i].geometry.type === 'MultiPolygon') {
			const { properties } = geofenceGEOjson[i]
			const name = properties.name || config.defaultGeofenceName + i.toString()
			const color = properties.color || config.defaultGeofenceColor

			const newFence = {
				name,
				id: i,
				color,
				multipath: [],
				group: properties.group || '',
				description: properties.description || '',
				userSelectable: !!(properties.userSelectable ?? true),
				displayInMatches: !!(properties.displayInMatches ?? true),
			}

			for (const coordList of geofenceGEOjson[i].geometry.coordinates) {
				const p = []
				coordList[0].forEach((coordinates) => p.push([coordinates[1], coordinates[0]]))

				newFence.multipath.push(p)
			}
			outGeofence.push(newFence)
		}
	}
	return outGeofence
}

function readGeofenceFile(config, filename) {
	let geofence = []

	try {
		const geofenceText = stripJsonComments(fs.readFileSync(filename, 'utf8'))
		geofence = JSON.parse(geofenceText)
	} catch (err) {
		if (filename.includes('http')) {
			log.warn(`[KŌJI] Cache not found - ${err.message}]`)
		} else {
			throw new Error(`Geofence ${filename} - ${err.message}`)
		}
	}

	if (geofence.type === 'FeatureCollection') geofence = getGeofenceFromGEOjson(config, geofence)

	return geofence
}

function readAllGeofenceFiles(config) {
	const fencePaths = Array.isArray(config.geofence.path) ? config.geofence.path : [config.geofence.path]
	const geofence = fencePaths.flatMap((fencePath) => readGeofenceFile(
		config,
		fencePath.startsWith('http')
			? path.resolve(__dirname, '../../.cache', `${fencePath.replace(/\//g, '__')}.json`)
			: path.join(__dirname, `../../${fencePath}`),
	))
	return geofence
}

module.exports = { readAllGeofenceFiles }