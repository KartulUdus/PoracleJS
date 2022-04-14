const stripJsonComments = require('strip-json-comments')
const fs = require('fs')
const path = require('path')

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
	let geofence

	try {
		const geofenceText = stripJsonComments(fs.readFileSync(filename, 'utf8'))
		geofence = JSON.parse(geofenceText)
	} catch (err) {
		throw new Error(`Geofence ${filename} - ${err.message}`)
	}

	if (geofence.type === 'FeatureCollection') geofence = getGeofenceFromGEOjson(config, geofence)

	return geofence
}

function readAllGeofenceFiles(config) {
	let geofence

	if (Array.isArray(config.geofence.path)) {
		const fence = []
		for (const fencePath of config.geofence.path) {
			const localFence = readGeofenceFile(config, path.join(__dirname, `../../${fencePath}`))
			fence.push(...localFence)
		}
		geofence = fence
	} else {
		geofence = readGeofenceFile(config, path.join(__dirname, `../../${config.geofence.path}`))
	}

	return geofence
}

module.exports = { readAllGeofenceFiles }