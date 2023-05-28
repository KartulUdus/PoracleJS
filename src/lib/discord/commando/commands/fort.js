const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const PoracleDiscordState = require('../../poracleDiscordState')

const commandLogic = require('../../../poracleMessage/commands/fort')

exports.run = async (client, msg, command) => {
	const pdm = new PoracleDiscordMessage(client, msg)
	const pds = new PoracleDiscordState(client)

	await commandLogic.run(pds, pdm, command[0])
}
