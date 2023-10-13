const { version } = require('../../package.json')

module.exports = async (fastify, options, next) => {
	fastify.get('/api/config/poracleWeb', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)
		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} not in whitelist` }
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) return { webserver: 'unhappy', reason: `ip ${req.ip} in blacklist` }

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		return {
			status: 'ok',
			version,
			locale: fastify.config.general.locale,
			prefix: fastify.config.discord.prefix,
			providerURL: fastify.config.geocoding.providerURL,
			addressFormat: fastify.config.locale.addressFormat,
			staticKey: fastify.config.geocoding.staticKey,
			pvpFilterMaxRank: fastify.config.pvp.pvpFilterMaxRank,
			pvpFilterGreatMinCP: fastify.config.pvp.pvpFilterGreatMinCP,
			pvpFilterUltraMinCP: fastify.config.pvp.pvpFilterUltraMinCP,
			pvpFilterLittleMinCP: fastify.config.pvp.pvpFilterLittleMinCP,
			pvpLittleLeagueAllowed: true,
			pvpCaps: fastify.config.pvp.levelCaps ?? [50],
			pvpRequiresMinCp: fastify.config.pvp.forceMinCp && fastify.config.pvp.dataSource === 'webhook',
			defaultPvpCap: fastify.config.tracking.defaultUserTrackingLevelCap || 0,
			defaultTemplateName: fastify.config.general.defaultTemplateName || '1',
			channelNotesContainsCategory: fastify.config.discord.checkRole && fastify.config.reconciliation.discord.updateChannelNotes,
			admins: {
				discord: fastify.config.discord.admins,
				telegram: fastify.config.telegram.admins,
			},
			maxDistance: fastify.config.tracking.maxDistance,
			defaultDistance: fastify.config.tracking.defaultDistance,
			everythingFlagPermissions: fastify.config.tracking.everythingFlagPermissions,
			disabledHooks: ['Pokemon', 'Raid', 'Pokestop', 'Invasion', 'Lure', 'Quest', 'Weather', 'Nest', 'Gym']
				.filter((hookType) => fastify.config.general[`disable${hookType}`]).map((hookType) => hookType.toLowerCase()),
			gymBattles: fastify.config.tracking.enableGymBattle ?? false,
		}
	})

	fastify.get('/api/config/templates', options, async (req) => {
		fastify.logger.info(`API: ${req.ip} ${req.routeOptions.method} ${req.routeOptions.url}`)
		if (fastify.config.server.ipWhitelist.length && !fastify.config.server.ipWhitelist.includes(req.ip)) {
			return {
				webserver: 'unhappy',
				reason: `ip ${req.ip} not in whitelist`,
			}
		}
		if (fastify.config.server.ipBlacklist.length && fastify.config.server.ipBlacklist.includes(req.ip)) {
			return {
				webserver: 'unhappy',
				reason: `ip ${req.ip} in blacklist`,
			}
		}

		const secret = req.headers['x-poracle-secret']
		if (!secret || !fastify.config.server.apiSecret || secret !== fastify.config.server.apiSecret) {
			return { status: 'authError', reason: 'incorrect or missing api secret' }
		}

		const typesForPlatform = (platform) => [...new Set(fastify.dts.filter((x) => !x.hidden && x.platform === platform).map((x) => x.type))]
		const languagesForType = (platform, type) => [...new Set(fastify.dts.filter((x) => !x.hidden && x.platform === platform && x.type === type).map((x) => x.language || '%'))]
		const templatesForLanguage = (platform, type, language) => [...new Set(fastify.dts.filter((x) => !x.hidden && x.platform === platform && x.type === type && ((language === '%' && x.language === undefined) || x.language === language)).map((x) => x.id))]

		return {
			status: 'ok',
			discord: Object.fromEntries(typesForPlatform('discord').map((x) => [x, Object.fromEntries(languagesForType('discord', x).map((y) => [y, templatesForLanguage('discord', x, y)]))])),
			telegram: Object.fromEntries(typesForPlatform('telegram').map((x) => [x, Object.fromEntries(languagesForType('telegram', x).map((y) => [y, templatesForLanguage('telegram', x, y)]))])),
		}
	})

	next()
}
