const fs = require('fs')
const { log } = require('./logger')

const GameData = { utilData: require('../util/util.json') }
const neededFiles = ['monsters', 'moves', 'items', 'grunts', 'questTypes', 'types', 'translations']

neededFiles.forEach((file) => {
	try {
		GameData[file] = JSON.parse(fs.readFileSync(`src/util/${file}.json`))
	} catch (e) {
		log.error(`Could not find ${file}.json, before starting Poracle you will need to run run 'npm run generate' or change your PM2 script to 'script: "npm start"'`)
		process.exit(9)
	}
})

module.exports = GameData
