const stripJsonComments = require('strip-json-comments')
const path = require('path')
const fs = require('fs')

function readDtsFiles() {
	let localDts = JSON.parse(stripJsonComments(fs.readFileSync(path.join(__dirname, '../../config/dts.json'), 'utf8')))
	const dirpath = path.join(__dirname, '../../config/dts')

	const filesList = fs.readdirSync(dirpath).filter((e) => path.extname(e).toLowerCase() === '.json')

	for (const filename of filesList) {
		const dtsAddition = JSON.parse(stripJsonComments(fs.readFileSync(path.join(dirpath, filename), 'utf8')))
		localDts = localDts.concat(dtsAddition)
	}

	return localDts
}

module.exports = { readDtsFiles }