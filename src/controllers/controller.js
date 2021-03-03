const inside = require('point-in-polygon')
const path = require('path')
const NodeGeocoder = require('node-geocoder')
const cp = require('child_process')
const EventEmitter = require('events')

const pcache = require('flat-cache')

const geoCache = pcache.load('geoCache', path.resolve(`${__dirname}../../../.cache/`))
const emojiFlags = require('emoji-flags')

const TileserverPregen = require('../lib/tileserverPregen')

class Controller extends EventEmitter {
	constructor(log, db, config, dts, geofence, GameData, discordCache, translatorFactory, mustache, weatherData) {
		super()
		this.db = db
		this.cp = cp
		this.config = config
		this.log = log
		this.dts = dts
		this.geofence = geofence
		this.GameData = GameData
		this.discordCache = discordCache
		this.translatorFactory = translatorFactory
		this.translator = translatorFactory ? this.translatorFactory.default : null
		this.mustache = mustache
		this.earthRadius = 6371 * 1000 // m
		this.weatherData = weatherData
		//		this.controllerData = weatherCacheData || {}
		this.tileserverPregen = new TileserverPregen(this.config, this.log)
		this.dtsCache = {}
	}

	getGeocoder() {
		switch (this.config.geocoding.provider.toLowerCase()) {
			case 'poracle': {
				return NodeGeocoder({
					provider: 'openstreetmap',
					osmServer: this.config.geocoding.providerURL,
					formatterPattern: this.config.locale.addressFormat,
				})
			}
			case 'nominatim': {
				return NodeGeocoder({
					provider: 'openstreetmap',
					osmServer: this.config.geocoding.providerURL,
					formatterPattern: this.config.locale.addressFormat,
				})
			}
			case 'google': {
				return NodeGeocoder({
					provider: 'google',
					httpAdapter: 'https',
					apiKey: this.config.geocoding.geocodingKey[Math.floor(Math.random() * this.config.geocoding.geocodingKey.length)],
				})
			}
			default:
			{
				return NodeGeocoder({
					provider: 'openstreetmap',
					formatterPattern: this.config.locale.addressFormat,
				})
			}
		}
	}

	getDts(logReference, templateType, platform, templateName, language) {
		const key = `${templateType} ${platform} ${templateName} ${language}`
		if (this.dtsCache[key]) {
			return this.dtsCache[key]
		}

		// Exact match
		let findDts = this.dts.find((template) => template.type === templateType && template.id.toString().toLowerCase() === templateName.toString() && template.platform === platform && template.language == language)

		// First right template and platform and no language (likely backward compatible choice)
		if (!findDts) {
			findDts = this.dts.find((template) => template.type === templateType && template.id.toString().toLowerCase() === templateName.toString() && template.platform === platform && !template.language)
		}

		// Default of right template type, platform and language
		if (!findDts) {
			findDts = this.dts.find((template) => template.type === templateType && template.default && template.platform === platform && template.language == language)
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

		this.log.debug(`${logReference}: Matched to DTS type: ${findDts.type} platform: ${findDts.platform} language: ${findDts.language} template: ${findDts.template}`)

		if (findDts.template.embed && Array.isArray(findDts.template.embed.description)) {
			findDts.template.embed.description = findDts.template.embed.description.join('')
		}

		if (Array.isArray(findDts.template.content)) {
			findDts.template.content = findDts.template.content.join('')
		}

		const template = JSON.stringify(findDts.template)
		const mustache = this.mustache.compile(template)

		this.dtsCache[key] = mustache
		return mustache
	}

	getDistance(start, end) {
		if (typeof (Number.prototype.toRad) === 'undefined') {
			// eslint-disable-next-line no-extend-native
			Number.prototype.toRad = function toRad() {
				return this * Math.PI / 180
			}
		}
		let lat1 = parseFloat(start.lat)
		let lat2 = parseFloat(end.lat)
		const lon1 = parseFloat(start.lon)
		const lon2 = parseFloat(end.lon)

		const dLat = (lat2 - lat1).toRad()
		const dLon = (lon2 - lon1).toRad()
		lat1 = lat1.toRad()
		lat2 = lat2.toRad()

		const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
				+ Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2)
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
		const d = this.earthRadius * c
		return Math.ceil(d)
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
		if (this.config.geocoding.provider.toLowerCase() == 'none') {
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

	escapeAddress(a) {
		a.streetName = this.escapeJsonString(a.streetName)
		a.addr = this.escapeJsonString(a.addr)
		return a
	}

	async getAddress(locationObject) {
		if (this.config.geocoding.provider.toLowerCase() == 'none') {
			return { addr: 'Unknown', flag: '' }
		}

		const cacheKey = `${String(+locationObject.lat.toFixed(3))}-${String(+locationObject.lon.toFixed(3))}`
		const cachedResult = geoCache.getKey(cacheKey)
		if (cachedResult) return this.escapeAddress(cachedResult)

		try {
			const geocoder = this.getGeocoder()
			const [result] = await geocoder.reverse(locationObject)
			const flag = emojiFlags[result.countryCode]
			if (!this.addressDts) {
				this.addressDts = this.mustache.compile(this.config.locale.addressFormat)
			}
			result.addr = this.addressDts(result)
			result.flag = flag ? flag.emoji : ''
			geoCache.setKey(cacheKey, result)
			geoCache.save(true)

			return this.escapeAddress(result)
		} catch (err) {
			this.log.error('getAddress: failed to fetch data', err)
			return { addr: 'Unknown', flag: '' }
		}
	}

	async pointInArea(point) {
		if (!this.geofence.length) return []
		const confAreas = this.geofence.map((area) => area.name.toLowerCase())
		const matchAreas = []

		for (const area of confAreas) {
			const areaObj = this.geofence.find((p) => p.name.toLowerCase() === area)
			if (inside(point, areaObj.path)) matchAreas.push(area)
		}
		return matchAreas
	}

	// database methods below

	async selectOneQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).where(conditions).first()
		} catch (err) {
			throw { source: 'slectOneQuery', error: err }
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
		try {
			return await this.db.insert(values).into(table)
		} catch (err) {
			throw { source: 'insertQuery', error: err }
		}
	}

	async misteryQuery(sql) {
		try {
			return this.returnByDatabaseType(await this.db.raw(sql))
		} catch (err) {
			throw { source: 'misteryQuery', error: err }
		}
	}

	async deleteWhereInQuery(table, id, values, valuesColumn) {
		try {
			return this.db.whereIn(valuesColumn, values).where(typeof id === 'object' ? id : { id }).from(table).del()
		} catch (err) {
			throw { source: 'deleteWhereInQuery unhappy', error: err }
		}
	}

	async insertOrUpdateQuery(table, values) {
		switch (this.config.database.client) {
			case 'pg': {
				const firstData = values[0] ? values[0] : values
				const query = `${this.db(table).insert(values).toQuery()} ON CONFLICT ON CONSTRAINT ${table}_tracking DO UPDATE SET ${
					Object.keys(firstData).map((field) => `${field}=EXCLUDED.${field}`).join(', ')}`
				return this.returnByDatabaseType(await this.db.raw(query))
			}
			case 'mysql': {
				const firstData = values[0] ? values[0] : values
				const query = `${this.db(table).insert(values).toQuery()} ON DUPLICATE KEY UPDATE ${
					Object.keys(firstData).map((field) => `\`${field}\`=VALUES(\`${field}\`)`).join(', ')}`
				return this.returnByDatabaseType(await this.db.raw(query))
			}
			default: {
				const constraints = {
					humans: 'id',
					monsters: 'monsters.id, monsters.profile_no, monsters.pokemon_id, monsters.min_iv, monsters.max_iv, monsters.min_level, monsters.max_level, monsters.atk, monsters.def, monsters.sta, monsters.form, monsters.gender, monsters.min_weight, monsters.great_league_ranking, monsters.great_league_ranking_min_cp, monsters.ultra_league_ranking, monsters.ultra_league_ranking_min_cp, monsters.min_time',
					raid: 'raid.id, raid.profile_no, raid.pokemon_id, raid.exclusive, raid.level, raid.team',
					egg: 'egg.id, egg.profile_no, egg.team, egg.exclusive, egg.level',
					quest: 'quest.id, quest.profile_no, quest.reward_type, quest.reward',
					invasion: 'invasion.id, invasion.profile_no, invasion.gender, invasion.grunt_type',
					lures: 'lures.id, lures.profile_no, lures.lure_id',
					weather: 'weather.id, weather.profile_no, weather.condition, weather.cell',
				}

				for (const val of values) {
					for (const v of Object.keys(val)) {
						if (typeof val[v] === 'string') val[v] = `'${val[v]}'`
					}
				}

				const firstData = values[0] ? values[0] : values
				const insertValues = values.map((o) => `(${Object.values(o).join()})`).join()
				const query = `INSERT INTO ${table} (${Object.keys(firstData)}) VALUES ${insertValues} ON CONFLICT (${constraints[table]}) DO UPDATE SET ${
					Object.keys(firstData).map((field) => `${field}=EXCLUDED.${field}`).join(', ')}`
				const result = await this.db.raw(query)
				return this.returnByDatabaseType(result)
			}
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

	getPokemonTypes(pokemonId, formId) {
		if (!+pokemonId) return ''
		const monsterFamily = Object.values(this.GameData.monsters).filter((m) => m.id === +pokemonId)
		const monster = Object.values(monsterFamily).find((m) => m.form.id === +formId)
		let types = ''
		if (monster) {
			types = monster.types.map((type) => type.id)
		} else {
			types = Object.values(monsterFamily).find((m) => m.form.id === +0).types.map((type) => type.id)
		}
		return types
	}

	execPromise(command) {
		return new Promise((resolve, reject) => {
			this.cp.exec(command, (error, stdout) => {
				if (error) {
					reject(error)
					return
				}
				resolve(stdout.trim())
			})
		})
	}
}

module.exports = Controller
