const fs = require('fs')
const { log } = require('./logger')

const GameData = { utilData: require('../util/util.json') }
const neededFiles = ['monsters', 'moves', 'items', 'grunts', 'questTypes']

neededFiles.forEach((file) => {
	try {
		GameData[file] = JSON.parse(fs.readFileSync(`src/util/${file}.json`))
	} catch (e) {
		log.error(`Could not find ${file}.json, before starting Poracle you will need to run run "npm run generate" or you can enable auto GameMaster fetching from your config.`)
		process.exit(9)
	}
})

module.exports = { GameData }
