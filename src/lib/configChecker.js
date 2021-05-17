const logs = require('./logger')

function checkDts(dts, config) {
	const platforms = []
	if (config.discord.enabled) {
		platforms.push('discord')
	}
	if (config.telegram.enabled) {
		platforms.push('telegram')
	}

	const languages = []
	languages.push(config.general.locale)

	for (const language of Object.keys(config.general.availableLanguages)) {
		if (language != config.general.locale) {
			languages.push(language)
		}
	}

	for (const platform of platforms) {
		for (const language of languages) {
			for (const type of ['monster', 'monsterNoIv', 'raid', 'egg', 'quest', 'invasion', 'lure', 'weatherchange', 'greeting']) {
				if (!dts.find((x) => x.platform === platform && x.type === type && x.language == language && x.default)) {
					logs.log.warn(`Config Check: DTS - No default entry found for platform:${platform} language:${language} type:${type}`)
				}
				if (!dts.find((x) => x.platform === platform && x.type === type && x.language == language && x.id.toString() == config.general.defaultTemplateName)) {
					logs.log.warn(`Config Check: DTS - No entry found for template “${config.general.defaultTemplateName}” platform:${platform} language:${language} type:${type} - this is the one that users will get if no template override`)
				}

				for (const dtsEntry of dts.filter((x) => x.platform === platform && x.type === type && x.language == language)) {
					if (!dtsEntry.id) {
						logs.log.warn(`Config Check: DTS - Template name blank in platform:${platform} language:${language} type:${type}`)
					} else if (dtsEntry.id.toString().includes('_')) {
						logs.log.warn(`Config Check: DTS - Template name includes underscore in platform:${platform} language:${language} type:${type} id:${dtsEntry.template}`)
					}
				}
			}
		}
	}
}

function checkConfig(config) {
	if (!['none', 'nominatim', 'google', 'openstreetmap'].includes(config.geocoding.provider.toLowerCase())) {
		logs.log.warn('Config Check: geocoding/provider is not one of none,nominatim,google,openstreetmap')
	}
	if (config.geocoding.provider == 'nominatim' && !config.geocoding.providerURL.startsWith('http')) {
		logs.log.warn('Config Check: geocoding/providerURL does not start with http')
	}

	if (config.discord.enabled) {
		if (!config.discord.guilds || !config.discord.guilds.length) {
			logs.log.warn('Config Check: discord guilds entry missing or empty - will cause reconciliation failures')
		}
	}
	if (!['none', 'tileservercache', 'google', 'osm', 'mapbox'].includes(config.geocoding.staticProvider.toLowerCase())) {
		logs.log.warn('Config Check: static provider is not one of none,tileservercache,google,osm,mapbox')
	}
	if (config.geocoding.staticProvider == 'tileservercache' && !config.geocoding.staticProviderURL.startsWith('http')) {
		logs.log.warn('Config Check: geocoding/staticProviderURL does not start with http')
	}
	if (!['ignore', 'delete', 'disable-user'].includes(config.general.roleCheckMode)) {
		logs.log.warn('Config Check: roleCheckMode is not one of ignore,delete,disable-user')
	}

	if (typeof config.discord.limitSec != 'undefined') logs.log.warn('Config Check: legacy option “discord.limitSec” given and ignored, replace with “alertLimits.timingPeriod”')
	if (typeof config.discord.limitAmount != 'undefined') logs.log.warn('Config Check: legacy option “discord.limitAmount” given and ignored, replace with “alertLimits.dmLimit/channelLimit”')

	// check whether tracking.everythingFlagPermissions has a valid value
	if (!['allow-any', 'allow-and-always-individually', 'allow-and-ignore-individually', 'deny'].includes(config.tracking.everythingFlagPermissions)) {
		logs.log.warn('Config Check: everything flag permissions is not one of allow-any,allow-and-always-individually,allow-and-ignore-individually,deny')
	}
	// check for legacy options
	if (typeof config.tracking.disableEverythingTracking != 'undefined') logs.log.warn('Config Check: legacy option “tracking.disableEverythingTracking” given and ignored, replace with “tracking.everythingFlagPermissions”')
	if (typeof config.tracking.forceEverythingSeparately != 'undefined') logs.log.warn('Config Check: legacy option “tracking.forceEverythingSeparately” given and ignored, replace with “tracking.everythingFlagPermissions”')
	if (config.general.roleCheckDeletionsAllowed == true) {
		logs.log.warn('Config Check: legacy option “roleCheckDeletionsAllowed“ given and ignored, replace with “general.roleCheckMode“')
	}
}

function checkGeofence(geofence) {
	if (!geofence.length) {
		logs.log.warn('Config Check: geofence.json is empty')
	}
	for (const fence of geofence) {
		if (!fence.name) {
			logs.log.warn('Config Check: geofence.json has entry with blank name')
		}
		if (fence.name.includes('_')) {
			logs.log.warn('Config Check: geofence.json has entry with underscore - should be a space')
		}
		if (!fence.path.length) {
			logs.log.warn('Config Check: geofence.json has empty path')
		}
	}
}

module.exports = { checkDts, checkConfig, checkGeofence }
