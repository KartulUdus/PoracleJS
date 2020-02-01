/* eslint no-extend-native: ["error", { "exceptions": ["Number"] }] */

const inside = require('point-in-polygon')
const path = require('path')
const NodeGeocoder = require('node-geocoder')
const cp = require('child_process')

const pcache = require('flat-cache')

const geoCache = pcache.load('.geoCache', path.resolve(`${__dirname}../../../`))
const emojiFlags = require('emoji-flags')

const { log } = require('../lib/logger')


class Controller {
	constructor(db, config, dts, geofence, monsterData, discordCache, translator, mustache) {
		this.db = db
		this.cp = cp
		this.config = config
		this.log = log
		this.dts = dts
		this.geofence = geofence
		this.monsterData = monsterData
		this.discordCache = discordCache
		this.utilData = require(path.join(__dirname, '../util/util'))
		this.translator = translator
		this.mustache = mustache
	}

	getGeocoder() {
		switch (this.config.geocoding.provider.toLowerCase()) {
			case 'poracle': {
				return NodeGeocoder({
					provider: 'openstreetmap',
					osmServer: 'https://geocoding.poracle.world/nominatim/',
					formatterPattern: this.config.locale.addressformat,
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
					formatterPattern: this.config.locale.addressformat,
				})
			}
		}
	}

	static getDistance(start, end) {
		if (typeof (Number.prototype.toRad) === 'undefined') {
			Number.prototype.toRad = function toRad() {
				return this * Math.PI / 180
			}
		}
		const earthRadius = 6371 * 1000 // m
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
		const d = earthRadius * c
		return Math.ceil(d)
	}

	getDiscordCache(id) {
		let ch = this.discordCache.get(id)
		if (ch === undefined) {
			this.discordCache.set(id, { count: 1 })
			ch = { count: 1 }
		}
		return ch
	}

	addDiscordCache(id) {
		let ch = this.discordCache.get(id)
		if (ch === undefined) {
			this.discordCache.set(id, { count: 1 })
			ch = { count: 1 }
		}
		const ttl = this.discordCache.getTtl(id)
		this.discordCache.set(id, { count: ch.count + 1 }, Math.floor((ttl - Date.now()) / 1000))
		return true
	}

	async geolocate(locationString) {
		try {
			const geocoder = this.getGeocoder()
			return await geocoder.geocode(locationString)
		} catch (err) {
			throw new Error({ source: 'geolocate', err })
		}
	}

	async getAddress(locationObject) {
		const cacheKey = `${String(+locationObject.lat.toFixed(3))}-${String(+locationObject.lon.toFixed(3))}`
		const cachedResult = geoCache.getKey(cacheKey)
		if (cachedResult) return cachedResult

		try {
			const geocoder = this.getGeocoder()
			const [result] = await geocoder.reverse(locationObject)
			const flag = emojiFlags[result.countryCode]
			const addressDts = this.mustache.compile(this.config.locale.addressFormat)
			result.addr = addressDts(result)
			result.flag = flag ? flag.emoji : ''
			geoCache.setKey(cacheKey, result)
			geoCache.save(true)
			return result
		} catch (err) {
			throw new Error({ source: 'getAddress', error: err })
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
			throw new Error({ source: 'slectOneQuery', error: err })
		}
	}

	async selectAllQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).where(conditions)
		} catch (err) {
			throw new Error({ source: 'slectOneQuery', error: err })
		}
	}

	async updateQuery(table, values, conditions) {
		try {
			return this.db(table).update(values).where(conditions)
		} catch (err) {
			throw new Error({ source: 'updateQuery', error: err })
		}
	}

	async countQuery(table, conditions) {
		try {
			const result = await this.db.select().from(table).where(conditions).count()
				.first()
			return +(Object.values(result)[0])
		} catch (err) {
			throw new Error({ source: 'countQuery', error: err })
		}
	}

	async insertQuery(table, values) {
		try {
			return await this.db.insert(values).into(table)
		} catch (err) {
			throw new Error({ source: 'insertQuery', error: err })
		}
	}

	async misteryQuery(sql) {
		try {
			return this.returnByDatabaseType(await this.db.raw(sql))
		} catch (err) {
			throw new Error({ source: 'misteryQuery', error: err })
		}
	}

	async deleteWhereInQuery(table, id, values, valuesColumn) {
		try {
			return this.db.whereIn(valuesColumn, values).where({ id }).from(table).del()
		} catch (err) {
			throw new Error({ source: 'deleteWhereInQuery unhappy', error: err })
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
					monsters: 'monsters.id, monsters.pokemon_id, monsters.min_iv, monsters.max_iv, monsters.min_level, monsters.max_level, monsters.atk, monsters.def, monsters.sta, monsters.min_weight, monsters.max_weight, monsters.form, monsters.max_atk, monsters.max_def, monsters.max_sta, monsters.gender',
					raid: 'raid.id, raid.pokemon_id, raid.exclusive, raid.level, raid.team',
					egg: 'egg.id, egg.team, egg.exclusive, egg.level',
					quest: 'quest.id, quest.reward_type, quest.reward',
					invasion: 'invasion.id, invasion.gender, invasion.grunt_type',
					weather: 'weather.id, weather.condition, weather.cell',
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
			throw new Error({ source: 'deleteQuery', error: err })
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

		return parseInt(this.config.discord.ivColors[colorIdx].replace(/^#/, ''), 16)
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
