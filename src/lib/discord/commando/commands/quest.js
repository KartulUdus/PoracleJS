const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const PoracleDiscordState = require('../../poracleDiscordState')

const commandLogic = require('../../../poracleMessage/commands/quest')

exports.run = async (client, msg, command) => {
	const pdm = new PoracleDiscordMessage(client, msg)
	const pds = new PoracleDiscordState(client)

	for (const c of command) {
		await commandLogic.run(pds, pdm, c)
	}
}
