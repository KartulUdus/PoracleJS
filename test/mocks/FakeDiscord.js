class Discord {
	constructor(controller, config, log, mustache, translator) {
		this.lastReact = ''
		this.lastMessage = ''
		this.config = config
		this.log = log
		this.dts = require('../../config/dts')
		this.mustache = mustache
		this.emojiStrip = require('emoji-strip')
		this.query = controller
		this.translator = translator
		this.re = require('../../src/util/regex')(translator)
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