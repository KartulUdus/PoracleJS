const PoracleDiscordUtil = require('./poracleDiscordUtil')
const PoracleDiscordMessage = require('./poracleDiscordMessage')

class PoracleDiscordState {
	constructor(client) {
		this.query = client.query
		this.scannerQuery = client.scannerQuery
		this.dts = client.dts
		this.log = client.logs.command
		this.GameData = client.GameData
		this.PoracleInfo = client.PoracleInfo
		this.query = client.query
		this.geofence = client.geofence
		this.mustache = client.mustache
		this.re = client.re
		this.updatedDiff = client.updatedDiff
		this.translatorFactory = client.translatorFactory
		this.translator = client.translator
		this.config = client.config
		this.hastebin = client.hastebin
		this.addToMessageQueue = (queueEntries) => client.emit('poracleAddMessageQueue', queueEntries)
		this.addToWebhookQueue = (queueEntries) => client.emit('poracleAddWebhookQueue', queueEntries)
		this.triggerReloadAlerts = () => client.emit('poracleReloadAlerts')
	}

	createMessage(msg) {
		return new PoracleDiscordMessage(this, msg)
	}

	createUtil(msg, options) {
		return new PoracleDiscordUtil(this, msg, options)
	}
}

module.exports = PoracleDiscordState
