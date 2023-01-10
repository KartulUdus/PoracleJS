const { S2 } = require('s2-geometry')
const S2ts = require('nodes2ts')

function getWeatherCellId(lat, lon) {
	const weatherCellKey = S2.latLngToKey(lat, lon, 10)
	return S2.keyToId(weatherCellKey)
}

async function generateWeatherTile(tileserverPregen, cellId, weatherId, imgUicons) {
	const data = {}

	data.condition = weatherId
	if (imgUicons) {
		data.imgUrl = await imgUicons.weatherIcon(data.condition) || this.config.fallbacks?.imgUrlWeather
	}

	const s2cell = new S2ts.S2Cell(new S2ts.S2CellId(cellId))
	const s2cellCenter = S2ts.S2LatLng.fromPoint(s2cell.getCenter())
	data.latitude = s2cellCenter.latRadians * 180 / Math.PI
	data.longitude = s2cellCenter.lngRadians * 180 / Math.PI
	data.coords = []
	for (let i = 0; i <= 3; i++) {
		const vertex = S2ts.S2LatLng.fromPoint(s2cell.getVertex(i))
		data.coords.push([parseFloat(vertex.latDegrees), parseFloat(vertex.lngDegrees)])
	}

	const staticMap = await tileserverPregen.getPregeneratedTileURL('info', 'weather', data, 'staticMap')

	return staticMap
}

module.exports = {
	generateWeatherTile, getWeatherCellId,
}