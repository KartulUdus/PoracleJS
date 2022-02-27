const fs = require('fs')
const path = require('path')

module.exports = () => {
	if (!fs.existsSync(path.join(__dirname, '../../config/local.json'))) {
		const defaultConfig = fs.readFileSync(path.join(__dirname, '../../config/default.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/local.json'), defaultConfig)
	}

	const defaultFiles = ['dts.json', 'geofence.json', 'pokemonAlias.json', 'partials.json', 'testdata.json']

	for (const configFile of defaultFiles) {
		const localFile = path.join(__dirname, '../../config', configFile)
		const defaultFile = path.join(__dirname, '../../config/defaults', configFile)

		if (!fs.existsSync(localFile) && fs.existsSync(defaultFile)) {
			const fileContents = fs.readFileSync(defaultFile, 'utf8')
			fs.writeFileSync(localFile, fileContents)
		}
	}
}
