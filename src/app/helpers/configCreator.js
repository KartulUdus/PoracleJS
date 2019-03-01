const fs = require('fs')
const log = require('../logger')
const path = require('path')

module.exports = () => {
	if (!process.env.DISCORD_TOKEN) {
		log.error(`DISCORD_TOKEN variable missing, please update/create ${path.join(__dirname, '../../../.env')} \nSee example in ${path.join(__dirname, '../../../.env.example')}`)
		process.exit()
	}
	if (!fs.existsSync(path.join(__dirname, '../../../config/questdts.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../../config/examples/questdts.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../../config/questdts.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../../config/dts.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../../config/examples/dts.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../../config/dts.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../../config/emoji.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../../config/examples/emoji.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../../config/emoji.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../../config/geofence.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../../config/examples/geofence.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../../config/geofence.json'), emergQuestDtsConf)
	}

}