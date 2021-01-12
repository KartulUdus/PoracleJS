const { mount } = require('telegraf')

/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = (query, dts, log, monsterData, utilData, geofence, config, re, translatorFactory) => mount('text', (ctx, next) => {
	ctx.state.controller = {
		query,
		dts,
		log,
		monsterData,
		utilData,
		geofence,
		config,
		re,
		translatorFactory,
	}
	ctx.state.controller.translator = translatorFactory.default
	return next()
})