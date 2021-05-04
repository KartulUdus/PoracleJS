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

async function generateGeofenceOverviewTile(geofence, tileserverPregen, areas) {
	// find fences but preserve order (because of the colour)
	const fences = areas.filter((x) => geofence.some((f) => f.name.toLowerCase() === x))
		.map((x) => geofence.find((f) => f.name.toLowerCase() == x))
	if (!fences || !fences.length) return null

	const position = tileserverPregen.autoposition({
		polygons: fences.map((x) => ({ path: x.path })),
	}, 1024, 768)

	function rainbow(numOfSteps, step) {
		// This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distinguishable vibrant markers in Google Maps and other apps.
		// Adam Cole, 2011-Sept-14
		// HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		let r; let g; let
			b
		const h = step / numOfSteps
		const i = ~~(h * 6)
		const f = h * 6 - i
		const q = 1 - f
		// eslint-disable-next-line default-case
		switch (i % 6) {
			case 0: r = 1; g = f; b = 0; break
			case 1: r = q; g = 1; b = 0; break
			case 2: r = 0; g = 1; b = f; break
			case 3: r = 0; g = q; b = 1; break
			case 4: r = f; g = 0; b = 1; break
			case 5: r = 1; g = 0; b = q; break
		}
		const c = `#${(`00${(~~(r * 255)).toString(16)}`).slice(-2)}${(`00${(~~(g * 255)).toString(16)}`).slice(-2)}${(`00${(~~(b * 255)).toString(16)}`).slice(-2)}`
		return (c)
	}

	const tilePolygons = []
	for (let n = 0; n < fences.length; n++) {
		tilePolygons.push({
			color: rainbow(fences.length, n),
			path: fences[n].path,
		})
	}

	const staticMap = await tileserverPregen.getPregeneratedTileURL('location', 'areaoverview', {
		zoom: position.zoom,
		latitude: position.latitude,
		longitude: position.longitude,
		fences: tilePolygons,
	}, 'staticMap')

	return staticMap
}

async function generateDistanceTile(tileserverPregen, latitude, longitude, distance) {
	const position = tileserverPregen.autoposition({
		circles: [{
			latitude: +latitude,
			longitude: +longitude,
			radiusM: +distance,
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

function generateDistanceTileURL(tileserverPregen, latitude, longitude, distance) {
	const position = tileserverPregen.autoposition({
		circles: [{
			latitude: +latitude,
			longitude: +longitude,
			radiusM: +distance,
		}],
	}, 500, 250)

	const mapUrl = tileserverPregen.getTileURL('location', 'distance', {
		zoom: position.zoom,
		latitude,
		longitude,
		distance,
	}, 'staticMap')
	return mapUrl
}

async function generateLocationTile(tileserverPregen, latitude, longitude) {
	const staticMap = tileserverPregen.getPregeneratedTileURL('location', 'location', {
		latitude,
		longitude,
	}, 'staticMap')
	return staticMap
}

function generateLocationTileURL(tileserverPregen, latitude, longitude) {
	const mapUrl = tileserverPregen.getTileURL('location', 'location', {
		latitude,
		longitude,
	}, 'staticMap')
	return mapUrl
}

module.exports = {
	generateGeofenceTile, generateDistanceTile, generateDistanceTileURL, generateLocationTile, generateLocationTileURL, generateGeofenceOverviewTile,
}