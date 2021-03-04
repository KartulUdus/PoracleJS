const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const PoracleDiscordState = require('../../poracleDiscordState')

const commandLogic = require('../../../poracleMessage/specials/apply')

exports.run = async (client, msg, command) => {
	const pdm = new PoracleDiscordMessage(client, msg)
	const pds = new PoracleDiscordState(client)

	await commandLogic.run(pds, pdm, command)
}
