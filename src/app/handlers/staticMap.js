const config = require('config')
const fs = require('fs')
const path = require('path')


module.exports = (req, reply) => {
	reply.view((path.join('src', 'app', 'helpers', 'staticmap', 'staticmap.html')), {
		lat: req.query.lat,
		lon: req.query.lon,
		mapzoom: config.geocoding.zoom,
		tileserver: config.geocoding.tileserver,
		height: config.geocoding.height,
		width: config.geocoding.width,
		leafletjs: fs.readFileSync(path.join(__dirname, '../../../', 'node_modules', 'leaflet', 'dist', 'leaflet.js'), 'utf8'),
		leafletcss: fs.readFileSync(path.join(__dirname, '../../../', 'node_modules', 'leaflet', 'dist', 'leaflet.css'), 'utf8')

	})

}