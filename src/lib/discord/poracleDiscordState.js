const PoracleDiscordUtil = require('./poracleDiscordUtil')
const PoracleDiscordMessage = require('./poracleDiscordMessage')

class PoracleDiscordState {
	constructor(client) {
		this.query = client.query
		this.dts = client.dts
		this.log = client.log
		this.GameData = client.GameData
		this.query = client.query
		this.geofence = client.geofence
		this.mustache = client.mustache
		this.re = client.re
		this.translatorFactory = client.translatorFactory
		this.translator = client.translator
		this.config = client.config
		this.hastebin = client.hastebin
	}

	createMessage(msg) {
		return new PoracleDiscordMessage(this, msg)
	}

	createUtil(msg, command) {
		return new PoracleDiscordUtil(this, msg, command)
	}
}

module.exports = PoracleDiscordState
