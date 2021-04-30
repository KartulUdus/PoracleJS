async function generateGeofenceTile(geofence, tileserverPregen, area) {
	const fence = geofence.find((x) => x.name.toLowerCase() == area.toLowerCase())

	if (!fence) return null

	const position = tileserverPregen.autoposition({
		polygons: [{
			path: fence.path,
		}],
	}, 500, 250)

	const staticMap = await tileserverPregen.getPregeneratedTileURL('location', 'area', {
		zoom: position.zoom,
		latitude: position.latitude,
		longitude: position.longitude,
		coords: fence.path,
	}, 'staticMap')

	return staticMap
}

async function generateDistanceTile(tileserverPregen, latitude, longitude, distance) {
	const position = tileserverPregen.autoposition({
		circles: [{
			latitude,
			longitude,
			radiusM: distance,
		}],
	}, 500, 250)

	const staticMap = tileserverPregen.getPregeneratedTileURL('location', 'distance', {
		zoom: position.zoom,
		latitude,
		longitude,
		distance,
	}, 'staticMap')
	return staticMap
}

module.exports = { generateGeofenceTile, generateDistanceTile }