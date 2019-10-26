const fs = require('fs')
const path = require('path')
const config = require('config')
const log = require('../logger')

module.exports = () => {
	if ((config.discord.enabled && !config.discord.token.length) || (config.telegram.enabled && !config.telegram.token.length)) {
		log.error(`DISCORD_TOKEN or TLG_TOKEN variable missing or not enabled, please update/create ${path.join(__dirname, '../../.env')} \nSee example in ${path.join(__dirname, '../../.env.example')}`)
		process.exit()
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/questdts.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/examples/questdts.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/questdts.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/dts.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/examples/dts.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/dts.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/emoji.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/examples/emoji.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/emoji.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/geofence.json'))) {
		const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/examples/geofence.json.example'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/geofence.json'), emergQuestDtsConf)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/local.json'))) {
		fs.writeFileSync(path.join(__dirname, '../../config/local.json'), '{}')
	}
	if (!fs.existsSync(path.join(__dirname, '../../.env'))) {
		fs.writeFileSync(path.join(__dirname, '../../.env'), '')
	}

}