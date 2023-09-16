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

	if (channels.clones) {
		for (const [id, destinations] of Object.entries(channels.clones)) {
			const targets = []
			for (const destId of destinations) {
				targets.push(...await trackManager.resolveId(destId))
			}
			for (const destId of targets) {
				await trackManager.copy(id, 0, destId, 0)
			}
		}
	}

	if (channels.filters) {
		for (const [id, filters] of Object.entries(channels.filters)) {
			const targets = []
			targets.push(...await trackManager.resolveId(id))

			for (const destId of targets) {
				const profileNo = await trackManager.getProfileNo(destId)
				await trackManager.reset(destId, profileNo)
				for (const filter of filters) {
					await filterLogic.applyFilter(id, profileNo, filter, false)
				}
			}
		}
	}
}

module.exports = processChannelConfig