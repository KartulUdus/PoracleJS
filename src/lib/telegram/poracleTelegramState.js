const PoracleTelegramUtil = require('./poracleTelegramUtil')
const PoracleTelegramMessage = require('./poracleTelegramMessage')

class PoracleTelegramState {
	constructor(ctx) {
		this.query = ctx.state.controller.query
		this.dts = ctx.state.controller.dts
		this.log = ctx.state.controller.log
		this.monsters = ctx.state.controller.monsterData
		this.query = ctx.state.controller.query
		this.geofence = ctx.state.controller.geofence
		this.utilData = ctx.state.controller.utilData
		this.re = ctx.state.controller.re
		this.translator = ctx.state.controller.translator
		this.config = ctx.state.controller.config
	}

	createMessage(msg) {
		return new PoracleTelegramMessage(this, msg)
	}

	createUtil(msg, command) {
		return new PoracleTelegramUtil(this, msg, command)
	}
}

module.exports = PoracleTelegramState