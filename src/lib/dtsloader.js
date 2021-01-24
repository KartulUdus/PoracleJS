const importFresh = require('import-fresh')
const path = require('path')
const fs = require('fs')

function readDtsFiles() {
	let localDts = importFresh(path.join(__dirname, '../../config/dts.json'))
	const dirpath = path.join(__dirname, '../../config/dts')

	const filesList = fs.readdirSync(dirpath).filter((e) => path.extname(e).toLowerCase() === '.json')

	for (const filename of filesList) {
		const dtsAddition = importFresh(path.join(dirpath, filename))
		localDts = localDts.concat(dtsAddition)
	}

	return localDts
}

module.exports = { readDtsFiles }