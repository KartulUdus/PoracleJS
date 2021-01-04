const { mount } = require('telegraf')
/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = (query, dts, log, monsterData, utilData, geofence, config, re, translator) => mount('text', (ctx, next) => {
	ctx.state.controller = {
		query,
		dts,
		log,
		monsterData,
		utilData,
		geofence,
		config,
		re,
		translator,
	}
	return next()
})