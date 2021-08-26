/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = (query, scannerQuery, dts, logs, GameData, PoracleInfo, geofence, config, re, translatorFactory, emojiStrip, mustache) => (ctx, next) => {
	ctx.state.controller = {
		query,
		scannerQuery,
		dts,
		logs,
		GameData,
		PoracleInfo,
		geofence,
		config,
		re,
		translatorFactory,
		emojiStrip,
		mustache,
	}
	ctx.state.controller.translator = translatorFactory.default
	return next()
}
