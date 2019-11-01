module.exports = (knex, config, log, monsterData, utilData, dts, geofence, translator) => {
	const Controller = require('../../../controllers/controller')
	const query = new Controller(knex, config)

	const re = require('../../../util/regex')(translator)
    const fs = require('fs')
	const mustache = require('handlebars')
	const emojiStrip = require('emoji-strip')
	const hastebin = require('hastebin-gen')
}