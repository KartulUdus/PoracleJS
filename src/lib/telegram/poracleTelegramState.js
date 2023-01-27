const { diff } = require('deep-object-diff')
const mustache = require('handlebars')
const hastebin = require('hastebin-gen')
const PoracleTelegramUtil = require('./poracleTelegramUtil')
const PoracleTelegramMessage = require('./poracleTelegramMessage')

class PoracleTelegramState {
	constructor(ctx) {
		this.query = ctx.state.controller.query
		this.scannerQuery = ctx.state.controller.scannerQuery
		this.dts = ctx.state.controller.dts
		this.log = ctx.state.controller.logs.command
		this.GameData = ctx.state.controller.GameData
		this.PoracleInfo = ctx.state.controller.PoracleInfo
		this.query = ctx.state.controller.query
		this.geofence = ctx.state.controller.geofence
		this.re = ctx.state.controller.re
		this.translator = ctx.state.controller.translator
		this.translatorFactory = ctx.state.controller.translatorFactory
		this.config = ctx.state.controller.config
		this.mustache = mustache
		this.hastebin = hastebin
		this.updatedDiff = diff
		this.addToMessageQueue = ctx.poracleAddMessageQueue
		this.addToWebhookQueue = ctx.poracleAddWebhookQueue
		this.triggerReloadAlerts = ctx.poracleReloadAlerts
	}

	createMessage(msg) {
		return new PoracleTelegramMessage(this, msg)
	}

	createUtil(msg, options) {
		return new PoracleTelegramUtil(this, msg, options)
	}
}

module.exports = PoracleTelegramState
