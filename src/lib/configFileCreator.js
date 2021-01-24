const fs = require('fs')
const path = require('path')
const config = require('config')
const dtsLoader = require('./dtsloader')

module.exports = () => {
	if (!fs.existsSync(path.join(__dirname, '../../config/local.json'))) {
		const defaultConfig = fs.readFileSync(path.join(__dirname, '../../config/default.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/local.json'), defaultConfig)
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/dts.json'))) {
		const defaultDtsConfig = fs.readFileSync(path.join(__dirname, '../../config/defaults/dts.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/dts.json'), defaultDtsConfig)
	} else {
		const defaultDtsConfig = require(path.join(__dirname, '../../config/defaults/dts.json'))
		const existingDtsConfig = dtsLoader.readDtsFiles()
		let writeNewFile = false
		if (config.discord.enabled) {
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'monster' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'monster' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'monsterNoIv' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'monsterNoIv' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'raid' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'raid' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'egg' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'egg' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'quest' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'quest' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'invasion' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'invasion' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'weatherchange' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'weatherchange' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'discord' && x.type === 'greeting' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'discord' && x.type === 'greeting' && x.default))
			}
		}
		if (config.telegram.enabled) {
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'monster' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'monster' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'monsterNoIv' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'monsterNoIv' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'raid' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'raid' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'egg' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'egg' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'quest' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'quest' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'invasion' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'invasion' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'weatherchange' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'weatherchange' && x.default))
			}
			if (!existingDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'greeting' && x.default)) {
				writeNewFile = true
				existingDtsConfig.push(defaultDtsConfig.find((x) => x.platform === 'telegram' && x.type === 'greeting' && x.default))
			}
		}
		if (writeNewFile) fs.writeFileSync(path.join(__dirname, '../../config/dts.json'), JSON.stringify(existingDtsConfig, null, '\t'))
	}
	if (!fs.existsSync(path.join(__dirname, '../../config/geofence.json'))) {
		const defaultGeofConfig = fs.readFileSync(path.join(__dirname, '../../config/defaults/geofence.json'), 'utf8')
		fs.writeFileSync(path.join(__dirname, '../../config/geofence.json'), defaultGeofConfig)
	}
}