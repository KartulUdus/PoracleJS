class Discord {
	constructor(controller, config, log, mustache) {
		this.lastReact = ''
		this.lastMessage = ''
		this.config = config
		this.log = log
		this.dts = require('../../config/dts')
		this.mustache = mustache
		this.emojiStrip = require('emoji-strip')
		this.query = controller
	}

	setDefaults() {
		this.lastReact = ''
		this.lastMessage = ''
	}

	setMessage(msg) {
		this.lastMessage = msg
	}

	setReact(e) {
		this.lastReact = e
	}
}

module.exports = Discord