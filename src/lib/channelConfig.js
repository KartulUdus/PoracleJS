const stripJsonComments = require('strip-json-comments')
const fs = require('fs')
const path = require('path')

async function processChannelConfig(trackManager, filterLogic) {
	let channels

	try {
		const filterText = stripJsonComments(fs.readFileSync(path.join(__dirname, '../../config/channels.json'), 'utf8'))
		channels = JSON.parse(filterText)
	} catch (err) {
		throw new Error(`channels.json - ${err.message}`)
	}

	if (channels.clone) {
		for (const [id, destinations] of Object.entries(channels.clone)) {
			const targets = []
			for (const destId of destinations) {
				targets.push(...await trackManager.resolveId(destId))
			}
			for (const destId of targets) {
				await trackManager.copy(id, 0, destId, 0)
			}
		}
	}

	if (channels.templates) {
		for (const [id, filters] of Object.entries(channels.templates)) {
			const profileNo = trackManager.getProfileNo(id)
			trackManager.reset(id, profileNo)
			for (const destId of filters) {
				await filterLogic.applyFilter(id, profileNo, destId, false)
			}
		}
	}
}

module.exports = processChannelConfig