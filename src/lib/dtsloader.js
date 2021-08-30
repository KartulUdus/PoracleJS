const stripJsonComments = require('strip-json-comments')
const path = require('path')
const fs = require('fs')

function readDtsFiles() {
	let localDts = []

	try {
		const dtsText = stripJsonComments(fs.readFileSync(path.join(__dirname, '../../config/dts.json'), 'utf8'))
		localDts = JSON.parse(dtsText)
	} catch (err) {
		throw new Error(`dts.json - ${err.message}`)
	}

	const dirpath = path.join(__dirname, '../../config/dts')

	const filesList = fs.readdirSync(dirpath).filter((e) => path.extname(e).toLowerCase() === '.json')

	for (const filename of filesList) {
		let dtsAddition
		try {
			const dtsText = stripJsonComments(fs.readFileSync(path.join(dirpath, filename), 'utf8'))
			dtsAddition = JSON.parse(dtsText)
		} catch (err) {
			throw new Error(`dts/${filename} - ${err.message}`)
		}
		localDts = localDts.concat(dtsAddition)
	}

	return localDts
}

module.exports = { readDtsFiles }