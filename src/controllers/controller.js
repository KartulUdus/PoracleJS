const inside = require('point-in-polygon')
const EventEmitter = require('events')
const path = require('path')
const fs = require('fs')
const Uicons = require('../lib/uicons')
const TileserverPregen = require('../lib/tileserverPregen')
const replaceAsync = require('../util/stringReplaceAsync')
const HideUriShortener = require('../lib/hideuriUrlShortener')
const ShlinkUriShortener = require('../lib/shlinkUrlShortener')
const YourlsUriShortener = require('../lib/yourlsUrlShortener')
const GetIntersection = require('../lib/getIntersection')

const EmojiLookup = require('../lib/emojiLookup')

class Controller extends EventEmitter {
	constructor(log, db, geocoder, scannerQuery, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherData, statsData, eventProviders) {
		super()
		this.db = db
		this.scannerQuery = scannerQuery
		this.config = config
		this.log = log
		this.dts = dts
		this.geofence = geofence
		this.GameData = GameData
		this.discordCache = discordCache
		this.translatorFactory = translatorFactory
		this.translator = translatorFactory ? this.translatorFactory.default : null
		this.mustache = mustache
		this.weatherData = weatherData
		this.statsData = statsData
		this.eventParser = eventProviders && eventProviders.pogoEvents
		this.shinyPossible = eventProviders && eventProviders.shinyPossible
		//		this.controllerData = weatherCacheData || {}
		this.tileserverPregen = new TileserverPregen(this.config, this.log)
		this.getIntersection = new GetIntersection(this.config, this.log)
		this.emojiLookup = new EmojiLookup(GameData.utilData.emojis)
		this.imgUicons = this.config.general.imgUrl ? new Uicons((this.config.general.images && this.config.general.images[this.constructor.name.toLowerCase()]) || this.config.general.imgUrl, 'png', this.log) : null
		this.imgUiconsAlt = this.config.general.imgUrlAlt ? new Uicons((this.config.general.imagesAlt && this.config.general.imagesAlt[this.constructor.name.toLowerCase()]) || this.config.general.imgUrlAlt, 'png', this.log) : null
		this.stickerUicons = this.config.general.stickerUrl ? new Uicons((this.config.general.stickers && this.config.general.stickers[this.constructor.name.toLowerCase()]) || this.config.general.stickerUrl, 'webp', this.log) : null
		this.dtsCache = {}
		this.geocoder = geocoder
		this.shortener = this.getShortener()
	}

	buildAreaString(matched) {
		let areastring = '1 = 0 '
		matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area.replace(/'/g, '\\\'')}"%' `)
		})
		let strictareastring = ''
		if (this.config.areaSecurity.enabled && this.config.areaSecurity.strictLocations) {
			strictareastring = 'and (humans.area_restriction IS NULL OR (1 = 0 '
			matched.forEach((area) => {
				strictareastring = strictareastring.concat(`or humans.area_restriction like '%"${area.replace(/'/g, '\\\'')}"%' `)
			})
			strictareastring = strictareastring.concat('))')
		}
		return { areastring, strictareastring }
	}

	getShortener() {
		switch (this.config.general.shortlinkProvider) {
			case 'shlink': {
				return new ShlinkUriShortener(this.log, this.config.general.shortlinkProviderURL, this.config.general.shortlinkProviderKey, this.config.general.shortlinkProviderDomain)
			}
			case 'yourls': {
				return new YourlsUriShortener(this.log, this.config.general.shortlinkProviderURL, this.config.general.shortlinkProviderKey)
			}
			default: {
				return new HideUriShortener(this.log)
			}
		}
	}

	setDts(dts) {
		this.dtsCache = { }
		this.dts = dts
	}

	setGeofence(geofence) {
		this.geofence = geofence
	}

	getDts(logReference, templateType, platform, templateName, language) {
		if (!templateName) templateName = this.config.general.defaultTemplateName?.toString() || '1'
		templateName = templateName.toLowerCase()

		const key = `${templateType} ${platform} ${templateName} ${language}`
		if (this.dtsCache[key]) {
			return this.dtsCache[key]
		}

		// Exact match
		let findDts = this.dts.find((template) => template.type === templateType && template.id && template.id.toString().toLowerCase() === templateName.toString() && template.platform === platform && template.language === language)

		// First right template and platform and no language (likely backward compatible choice)
		if (!findDts) {
			findDts = this.dts.find((template) => template.type === templateType && template.id && template.id.toString().toLowerCase() === templateName.toString() && template.platform === platform && !template.language)
		}

		// Default of right template type, platform and language
		if (!findDts) {
			findDts = this.dts.find((template) => template.type === templateType && template.default && template.platform === platform && template.language === language)
		}

		// First default of right template type and platform with empty language
		if (!findDts) {
			findDts = this.dts.find((template) => template.type === templateType && template.default && template.platform === platform && !template.language)
		}

		// First default of right template type and platform
		if (!findDts) {
			findDts = this.dts.find((template) => template.type === templateType && template.default && template.platform === platform)
		}

		if (!findDts) {
			this.log.warn(`${logReference}: Cannot find DTS template or matching default ${key}`)
			return null
		}

		this.log.debug(`${logReference}: Matched to DTS type: ${findDts.type} platform: ${findDts.platform} language: ${findDts.language} template: ${findDts.id}`)

		let template
		if (findDts.templateFile) {
			let filepath
			try {
				filepath = path.join(__dirname, '../../config', findDts.templateFile)
				template = fs.readFileSync(filepath, 'utf8')
			} catch (err) {
				this.log.error(`${logReference}: Unable to load DTS filepath ${filepath} from DTS type: ${findDts.type} platform: ${findDts.platform} language: ${findDts.language} template: ${findDts.template}`)
				return null
			}
		} else {
			const loadInclude = (includeString) => {
				const includePath = includeString.split(' ')[1]
				const filepath = path.join(__dirname, '../../config/dts', includePath)
				try {
					template = fs.readFileSync(filepath, 'utf8')
				} catch (err) {
					this.log.error(`${logReference}: Unable to load @include ${includePath} filepath ${filepath} from DTS type: ${findDts.type} platform: ${findDts.platform} language: ${findDts.language} template: ${findDts.template}`)
					return `Cannot load @include - ${includeString}`
				}
				return template
			}

			if (findDts.template.embed) {
				for (const field of ['description', 'title']) {
					if (findDts.template.embed[field]) {
						if (Array.isArray(findDts.template.embed[field])) {
							findDts.template.embed[field] = findDts.template.embed[field].join('')
						}
						if (findDts.template.embed[field].startsWith('@include')) {
							findDts.template.embed[field] = loadInclude(findDts.template.embed[field])
						}
					}
				}
			}

			if (Array.isArray(findDts.template.content)) {
				findDts.template.content = findDts.template.content.join('')
			}
			if (findDts.template.content?.startsWith('@include')) {
				findDts.template.content = loadInclude(findDts.template.content)
			}

			template = JSON.stringify(findDts.template)
		}

		const mustache = this.mustache.compile(template)

		this.dtsCache[key] = mustache
		return mustache
	}

	async createMessage(logReference, templateType, platform, template, language, ping, view) {
		const mustache = this.getDts(logReference, templateType, platform, template, language)
		let message
		if (mustache) {
			let mustacheResult
			try {
				mustacheResult = mustache(view, { data: { language, platform } })
			} catch (err) {
				this.log.error(`${logReference}: Error generating mustache results for ${platform}/${templateType}:${template}/${language}`, err, view)
			}
			if (mustacheResult) {
				mustacheResult = await this.urlShorten(mustacheResult)
				try {
					message = JSON.parse(mustacheResult)
					if (ping) {
						if (!message.content) {
							message.content = ping
						} else {
							message.content += ping
						}
					}
				} catch (err) {
					this.log.error(`${logReference}: Error JSON parsing mustache results ${mustacheResult}`, err)
				}
			}
		}

		if (!message) {
			message = { content: `*Poracle*: An alert was triggered with invalid or missing message template - ref: ${logReference}\nid: '${template}' type: '${templateType}' platform: '${platform}' language: '${language}'` }
			this.log.warn(`${logReference}: Invalid or missing message template ref: ${logReference}\nid: '${template}' type: '${templateType}' platform: '${platform}' language: '${language}'`)
		}

		return message
	}

	async getStaticMapUrl(logReference, data, maptype, keys, pregenKeys) {
		switch (this.config.geocoding.staticProvider.toLowerCase()) {
			case 'tileservercache': {
				const tileServerOptions = this.tileserverPregen.getConfigForTileType(maptype)

				if (tileServerOptions.includeStops && tileServerOptions.pregenerate && this.scannerQuery) {
					const limits = this.tileserverPregen.limits(data.latitude, data.longitude, tileServerOptions.width, tileServerOptions.height, tileServerOptions.zoom)
					data.nearbyStops = await this.scannerQuery.getStopData(limits[0][0], limits[0][1], limits[1][0], limits[1][1])
					if (data.nearbyStops && this.imgUicons) {
						data.uiconPokestopUrl = await this.imgUicons.pokestopIcon(0)
						for (const stop of data.nearbyStops) {
							switch (stop.type) {
								case 'gym': {
									stop.imgUrl = await this.imgUicons.gymIcon(stop.teamId, 6 - stop.slots, false, false) || this.config.fallbacks?.imgUrlGym
									break
								}
								case 'pokestop': {
									break
								}
								default:
							}
						}
					}
				}

				if (tileServerOptions.type && tileServerOptions.type !== 'none') {
					if (!tileServerOptions.pregenerate) {
						data.staticMap = await this.tileserverPregen.getTileURL(
							logReference,
							maptype,
							Object.fromEntries(Object.entries(data)
								.filter(([field]) => keys.includes(field))),
							tileServerOptions.type,
						)
					} else {
						data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(
							logReference,
							maptype,
							pregenKeys ? Object.fromEntries(Object.entries(data).filter(([field]) => ['nearbyStops', 'uiconPokestopUrl'].includes(field) || pregenKeys.includes(field))) : data,
							tileServerOptions.type,
						)
					}
				}

				break
			}

			case 'google': {
				data.staticMap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${this.config.geocoding.type}&zoom=${this.config.geocoding.zoom}&size=${this.config.geocoding.width}x${this.config.geocoding.height}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
				break
			}
			case 'osm': {
				data.staticMap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${this.config.geocoding.width},${this.config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${this.config.geocoding.zoom}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
				break
			}
			case 'mapbox': {
				data.staticMap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${this.config.geocoding.zoom},0,0/${this.config.geocoding.width}x${this.config.geocoding.height}?access_token=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
				break
			}
			default: {
				data.staticMap = ''
			}
		}
		data.staticMap = data.staticMap || this.config.fallbacks?.staticMap
	}

	// eslint-disable-next-line class-methods-use-this
	getDistance(start, end) {
		const lat1 = parseFloat(start.lat)
		const lat2 = parseFloat(end.lat)
		const lon1 = parseFloat(start.lon)
		const lon2 = parseFloat(end.lon)

		// https://www.movable-type.co.uk/scripts/latlong.html

		const R = 6371e3 // metres
		const φ1 = lat1 * Math.PI / 180 // φ, λ in radians
		const φ2 = lat2 * Math.PI / 180
		const Δφ = (lat2 - lat1) * Math.PI / 180
		const Δλ = (lon2 - lon1) * Math.PI / 180

		const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
			+ Math.cos(φ1) * Math.cos(φ2)
			* Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

		const d = R * c // in metres

		return Math.ceil(d)
	}

	// eslint-disable-next-line class-methods-use-this
	getBearing(start, end) {
		const lat1 = parseFloat(start.lat)
		const lat2 = parseFloat(end.lat)
		const lon1 = parseFloat(start.lon)
		const lon2 = parseFloat(end.lon)

		// https://www.movable-type.co.uk/scripts/latlong.html

		const φ1 = lat1 * Math.PI / 180 // φ, λ in radians
		const φ2 = lat2 * Math.PI / 180
		const λ1 = lon1 * Math.PI / 180 // φ, λ in radians
		const λ2 = lon2 * Math.PI / 180

		const y = Math.sin(λ2 - λ1) * Math.cos(φ2)
		const x = Math.cos(φ1) * Math.sin(φ2)
			- Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ2 - λ1)
		const θ = Math.atan2(y, x)
		const brng = (θ * 180 / Math.PI + 360) % 360 // in degrees

		return brng
	}

	// eslint-disable-next-line class-methods-use-this
	getBearingEmoji(brng) {
		if (brng < 22.5) return 'north'
		if (brng < 45 + 22.5) return 'northwest'
		if (brng < 90 + 22.5) return 'west'
		if (brng < 135 + 22.5) return 'southwest'
		if (brng < 180 + 22.5) return 'south'
		if (brng < 225 + 22.5) return 'southeast'
		if (brng < 270 + 22.5) return 'east'
		if (brng < 315 + 22.5) return 'northeast'

		return 'north'
	}

	isRateLimited(id) {
		return !!this.discordCache.get(id)
	}

	getRateLimitTimeToRelease(id) {
		const ttl = this.discordCache.get(id)
		if (!ttl) return 0
		return Math.max((ttl - Date.now()) / 1000, 0)
	}

	async geolocate(locationString) {
		if (this.config.geocoding.provider.toLowerCase() === 'none') {
			return []
		}

		try {
			const geocoder = this.getGeocoder()
			return await geocoder.geocode(locationString)
		} catch (err) {
			throw { source: 'geolocate', err }
		}
	}

	// eslint-disable-next-line class-methods-use-this
	escapeJsonString(s) {
		if (!s) return s
		return s.replace(/"/g, '\'\'').replace(/\n/g, ' ').replace(/\\/g, '?')
	}

	/**
	 * Replace URLs with shortened versions if surrounded by <S< >S>
	 */
	// eslint-disable-next-line class-methods-use-this
	async urlShorten(s) {
		return replaceAsync(
			s,
			/<S<(.*?)>S>/g,
			async (match, name) => this.shortener.getShortlink(name),
		)
	}

	async getAddress(locationObject) {
		const addr = await this.geocoder.getAddress(locationObject)
		for (const key of Object.keys(addr)) {
			if (typeof addr[key] === 'string') addr[key] = this.escapeJsonString(addr[key])
		}
		return addr
	}

	async obtainIntersection(data) {
		const inte = await this.getIntersection.getIntersection(data.latitude, data.longitude)
		return inte
	}

	pointInArea(point) {
		if (!this.geofence.length) return []
		const matchAreas = []
		for (const areaObj of this.geofence) {
			if (areaObj.path) {
				if (inside(point, areaObj.path)) {
					matchAreas.push({
						name: areaObj.name,
						description: areaObj.description,
						displayInMatches: areaObj.displayInMatches ?? true,
						group: areaObj.group,
					})
				}
			} else if (areaObj.multipath) {
				for (const p of areaObj.multipath) {
					if (inside(point, p)) {
						matchAreas.push({
							name: areaObj.name,
							description: areaObj.description,
							displayInMatches: areaObj.displayInMatches ?? true,
							group: areaObj.group,
						})
						break
					}
				}
			}
		}
		return matchAreas
	}

	// database methods below

	async selectOneQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).where(conditions).first()
		} catch (err) {
			throw { source: 'selectOneQuery', error: err }
		}
	}

	async selectAllQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).where(conditions)
		} catch (err) {
			throw { source: 'selectAllQuery', error: err }
		}
	}

	async selectAllNotQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).whereNot(conditions)
		} catch (err) {
			throw { source: 'selectAllNotQuery', error: err }
		}
	}

	async updateQuery(table, values, conditions) {
		try {
			return this.db(table).update(values).where(conditions)
		} catch (err) {
			throw { source: 'updateQuery', error: err }
		}
	}

	async countQuery(table, conditions) {
		try {
			const result = await this.db.select().from(table).where(conditions).count()
				.first()
			return +(Object.values(result)[0])
		} catch (err) {
			throw { source: 'countQuery', error: err }
		}
	}

	async insertQuery(table, values) {
		if (Array.isArray(values) && !values.length) return
		try {
			return await this.db.insert(values).into(table)
		} catch (err) {
			throw { source: 'insertQuery', error: err }
		}
	}

	async mysteryQuery(sql) {
		try {
			return this.returnByDatabaseType(await this.db.raw(sql))
		} catch (err) {
			throw { source: 'mysteryQuery', error: err }
		}
	}

	async deleteWhereInQuery(table, id, values, valuesColumn) {
		try {
			return this.db.whereIn(valuesColumn, values).where(typeof id === 'object' ? id : { id }).from(table).del()
		} catch (err) {
			throw { source: 'deleteWhereInQuery unhappy', error: err }
		}
	}

	async deleteQuery(table, values) {
		try {
			return await this.db(table).where(values).del()
		} catch (err) {
			throw { source: 'deleteQuery', error: err }
		}
	}

	returnByDatabaseType(data) {
		switch (this.config.database.client) {
			case 'pg': {
				return data.rows
			}
			case 'mysql': {
				return data[0]
			}
			default: {
				return data
			}
		}
	}

	findIvColor(iv) {
		// it must be perfect if none of the ifs kick in
		// orange / legendary
		let colorIdx = 5

		if (iv < 25) colorIdx = 0 // gray / trash / missing
		else if (iv < 50) colorIdx = 1 // white / common
		else if (iv < 82) colorIdx = 2 // green / uncommon
		else if (iv < 90) colorIdx = 3 // blue / rare
		else if (iv < 100) colorIdx = 4 // purple epic

		return this.config.discord.ivColors[colorIdx]
	}
}

module.exports = Controller
