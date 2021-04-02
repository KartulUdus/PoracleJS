const path = require('path')
const fs = require('fs')

function readCustomMaps() {
	const maps = []

	const dirpath = path.join(__dirname, '../../config/customMaps')

	const filesList = fs.readdirSync(dirpath).filter((e) => path.extname(e).toLowerCase() === '.json')

	for (const filename of filesList) {
		const mapAddition = require(path.join(dirpath, filename))
		if (Array.isArray(mapAddition)) {
			maps.push(...mapAddition)
		} else {
			maps.push(mapAddition)
		}
	}

	return maps
}

module.exports = readCustomMaps()