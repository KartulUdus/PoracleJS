const PoracleDiscordUtil = require('./poracleDiscordUtil')
const PoracleDiscordMessage = require('./poracleDiscordMessage')

class PoracleDiscordState {
	constructor(client) {
		this.query = client.query
		this.dts = client.dts
		this.log = client.log
		this.monsters = client.monsters
		this.query = client.query
		this.geofence = client.geofence
		this.utilData = client.utilData
		this.mustache = client.mustache
		this.re = client.re
		this.translator = client.translator
		this.config = client.config
	}

	createMessage(msg) {
		return new PoracleDiscordMessage(this, msg)
	}

	createUtil(msg, command) {
		return new PoracleDiscordUtil(this, msg, command)
	}
}

module.exports = PoracleDiscordState
