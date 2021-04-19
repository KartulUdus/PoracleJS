const fs = require('fs')
const path = require('path')

module.exports = () => {
	if (!fs.existsSync(path.join(__dirname, '../../config/local.json'))) {
		const defaultConfig = fs.readFileSync(path.join(__dirname, '../../config/default.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/local.json'), defaultConfig)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/dts.json'))) {
		const defaultDtsConfig = fs.readFileSync(path.join(__dirname, '../../config/defaults/dts.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/dts.json'), defaultDtsConfig)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/geofence.json'))) {
		const defaultGeofConfig = fs.readFileSync(path.join(__dirname, '../../config/defaults/geofence.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/geofence.json'), defaultGeofConfig)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/pokemonAlias.json'))) {
		const defaultGeofConfig = fs.readFileSync(path.join(__dirname, '../../config/defaults/pokemonAlias.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/pokemonAlias.json'), defaultGeofConfig)
	}
}