/* eslint class-methods-use-this: ["error", { "exceptMethods": ["getGeocoder"] }] */

const config = require('config')
const inside = require('point-in-polygon')
const _ = require('lodash')
const NodeGeocoder = require('node-geocoder')
const child = require('child_process')

const ivColorData = config.discord.iv_colors
const emojiFlags = require('emoji-flags')
const uuid = require('uuid/v4')
const Cache = require('ttl')
const geofence = require('../../config/geofence.json')
const baseStats = require('../util/base_stats')
const cpMultipliers = require('../util/cp-multipliers')
const questDts = require('../../config/questdts')
const messageDts = require('../../config/dts')

const pcache = require('../helpers/persistent-cache')

const log = require('../logger')

const discordcache = new Cache({
	ttl: config.discord.limitsec * 1000,
})
discordcache.on('put', (key, val, ttl) => { })
discordcache.on('hit', (key, val) => { })

// setup geocoding cache

const addrCache = pcache({
	base: '.cache',
	name: 'addrCache',
	duration: 30 * 24 * 3600 * 1000, // 30 days is what google allows
})

class Controller {

	constructor(db) {
		this.db = db
		this.log = log
		this.qdts = questDts
		this.mdts = messageDts
		this.ivColorData = ivColorData
		this.geofence = geofence
		this.cpMultipliers = cpMultipliers
		this.discordcache = discordcache
		this.uuid = uuid()
		this.cp = child

	}

	// Geocoding stuff below


	getGeocoder() {
		switch (config.geocoding.provider.toLowerCase()) {
                        case 'nominatim': {
                                return NodeGeocoder({
                                        provider: 'openstreetmap',
                                        osmServer: config.geocoding.providerURL,
                                        formatterPattern: config.locale.addressformat,
                                })
                        }
			case 'poracle': {
				return NodeGeocoder({
					provider: 'openstreetmap',
					osmServer: 'https://geocoding.poracle.world/nominatim/',
					formatterPattern: config.locale.addressformat,
				})
			}
			case 'google': {
				return NodeGeocoder({
					provider: 'google',
					httpAdapter: 'https',
					apiKey: _.sample(config.geocoding.geocodingKey),
				})
			}
			default:
			{
				return NodeGeocoder({
					provider: 'openstreetmap',
					osmServer: config.geocoding.osmServer ? config.geocoding.osmServer : 'http://nominatim.openstreetmap.org',
					formatterPattern: config.locale.addressformat,
				})
			}
		}
	}

	async geolocate(locationString) {
		return new Promise((resolve, reject) => {
			this.getGeocoder().geocode(locationString)
				.then((result) => {
					resolve(result)
					log.log({ level: 'debug', message: `geolocate ${locationString}`, event: 'geo:geolocate' })
				})
				.catch((err) => {
					reject(log.error(`Geolocate failed with error: ${err}`))
				})
		})
	}

	async getAddress(locationObject) {
		return new Promise((resolve) => {
			const cacheKey = `${locationObject.lat}-${locationObject.lon}`
			const res = {}
			addrCache.get(cacheKey, (err, addr) => {
				if (err) log.error(err)
				if (!addr) {
					this.getGeocoder().reverse(locationObject)
						.then((geocodeResult) => {
							res.addr = config.locale.addressformat
								.replace(/%n/, geocodeResult[0].streetNumber || '')
								.replace(/%S/, geocodeResult[0].streetName || '')
								.replace(/%z/, geocodeResult[0].zipcode || '')
								.replace(/%P/, geocodeResult[0].country || '')
								.replace(/%p/, geocodeResult[0].countryCode || '')
								.replace(/%c/, geocodeResult[0].city || '')
								.replace(/%T/, geocodeResult[0].state || '')
								.replace(/%t/, geocodeResult[0].stateCode || '')
							res.streetNumber = geocodeResult[0].streetNumber || ''
							res.streetName = geocodeResult[0].streetName || ''
							res.neighbourhood = geocodeResult[0].neighbourhood || ''
							res.zipcode = geocodeResult[0].zipcode || ''
							res.country = geocodeResult[0].country || ''
							res.countryCode = geocodeResult[0].countryCode || ''
							res.city = geocodeResult[0].city || ''
							res.state = geocodeResult[0].state || ''
							res.stateCode = geocodeResult[0].stateCode || ''
							const flag = emojiFlags[`${res.countryCode}`]
							res.flag = flag ? flag.emoji : ''

							if (res && geocodeResult.length > 0) {
								addrCache.put(cacheKey, res, (error, r) => {
									if (error) log.error(`Error saving addr of ${cacheKey}: ${error}`)
								})
							}
							log.log({ level: 'debug', message: `getAddress ${locationObject.lat}, ${locationObject.lon}`, event: 'geo:getAddress' })
							resolve(res)
						})
						.catch((err) => {
							res.countryCode = 'EE'
							log.error('GetAddress failed with error', err)
							resolve(res)
						})
				}
				else {
					log.log({ level: 'debug', message: `getAddress ${locationObject.lat}, ${locationObject.lon}`, event: 'geo:getAddress' })
					resolve(addr)
				}
			})
		})
	}


	async pointInArea(point) {
		return new Promise((resolve) => {
			const confAreas = this.geofence.map((area) => area.name.toLowerCase())
			const matchAreas = []
			confAreas.forEach((area) => {
				const areaObj = _.find(this.geofence, (p) => p.name.toLowerCase() === area)
				if (inside(point, areaObj.path)) {
					matchAreas.push(area)
				}
			})
			log.log({ level: 'debug', message: `pointInArea ${point[0]}, ${point[1]}`, event: 'geo:pointInArea' })
			resolve(matchAreas)
		})
	}

	getDiscordCache(id) {
		let ch = _.cloneDeep(this.discordcache.get(id))
		if (ch === undefined) {
			this.discordcache.put(id, 1)
			ch = 1
		}
		return ch
	}

	addDiscordCache(id) {
		let ch = _.cloneDeep(this.discordcache.get(id))
		if (ch === undefined) {
			this.discordcache.put(id, 1)
			ch = 1
		}
		this.discordcache.put(id, ch + 1)
		return true
	}

	// DB queries


	async updateLocation(table, lat, lon, col, value) {
		return new Promise((resolve, reject) => {
			this.db.query('UPDATE ?? set latitude = ?, longitude = ? where ?? = ?', [table, lat, lon, col, value])
				.then(log.log({ level: 'debug', message: 'updateLocation query', event: 'sql:updateLocation' }))
				.catch((err) => {
					reject(log.error(`updateLocation errored with: ${err}`))
				})
		})
	}

	async selectOneQuery(table, column, value) {
		return new Promise((resolve, reject) => {
			this.db.query('SELECT * FROM ?? WHERE ?? = ?', [table, column, value])
				.then((result) => {
					log.log({ level: 'debug', message: 'selectOneQuery query', event: 'sql:selectOneQuery' })
					resolve(result[0][0])
				})
				.catch((err) => {
					reject(err)
				})
		})
	}

	async dropTableQuery(table) {
		return new Promise((resolve) => {
			const q = `DROP TABLE ${table}`
			this.db.query(q)
				.then((result) => {
					log.log({ level: 'debug', message: `dropTableQuery ${table}`, event: 'sql:dropTableQuery' })
					resolve(result[0][0])
				})
				.catch((err) => {
					log.error(`dropTableQuery errored with: ${err}`)
				})
		})
	}

	async countQuery(what, from, where, value) {
		return new Promise((resolve, reject) => {
			this.db.query('SELECT count(??) as count FROM ?? WHERE ?? = ?', [what, from, where, value])
				.then((result) => {
					log.log({ level: 'debug', message: `countQuery ${from}`, event: 'sql:countQuery' })
					resolve(result[0][0].count)
				})
				.catch((err) => {
					reject(err)
				})
		})
	}

	async insertQuery(table, columns, values) {
		return new Promise((resolve) => {
			this.db.query(`INSERT INTO ?? (${columns.join(',')}) VALUES (?)`, [table, values])
				.then(() => {
					log.log({ level: 'debug', message: `insertQuery ${table}`, event: 'sql:insertQuery' })
					resolve()
				})
				.catch((err) => {
					log.error(`inseertQuery errored with: ${err}`)
				})
		})
	}


	async insertOrUpdateQuery(table, columns, values) {

		const cols = columns.join(', ')
		const multiValues = values.map((x) => x.map((y) => (typeof y === 'boolean' ? y : `'${y}'`)).join()).join('), \n(')
		const duplicate = columns.map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(', ')
		const query = `INSERT INTO ${table} (${cols})
                      VALUES (${multiValues})
                      ON DUPLICATE KEY UPDATE ${duplicate}`
		return new Promise((resolve, reject) => {
			this.db.query(query)
				.then((result) => {
					log.log({ level: 'debug', message: `insertOrUpdateQuery ${table}`, event: 'sql:insertOrUpdateQuery' })
					resolve(result)
				})
				.catch((err) => {
					log.error(`insertOrUpdateQuery errored with: ${err}`)
					reject(err)
				})
		})
	}


	async updateQuery(table, field, newvalue, col, value) {
		return new Promise((resolve, reject) => {
			this.db.query('UPDATE ?? SET ?? = ? where ?? = ?', [table, field, newvalue, col, value])
				.then(log.log({ level: 'debug', message: `updateQuery ${table}`, event: 'sql:updateQuery' }))
				.catch((err) => {
					log.error(`inseertQuery errored with: ${err}`)
					reject(err)
				})
		})
	}


	async mysteryQuery(query) {
		return new Promise((resolve, reject) => {
			this.db.query(query)
				.then((result) => {
					log.log({ level: 'debug', message: 'mysteryQuery', event: 'sql:mysteryQuery' })
					resolve(result[0])
				})
				.catch((err) => {
					reject(log.error(`mysteryQuery errored with: ${err}`))
				})
		})
	}

	async deleteQuery(table, column, value) {
		return new Promise((resolve, reject) => {
			this.db.query('DELETE FROM ?? WHERE ?? = ?', [table, column, value])
				.then((result) => {
					resolve(result[0].count)
					log.log({ level: 'debug', message: `deleteQuery ${table}`, event: 'sql:deleteQuery' })
				})
				.catch((err) => {
					log.error(`deleteQuery errored with: ${err.message}`)
					reject(err)
				})
		})
	}

	async deleteByIdQuery(table, column, value, id) {
		return new Promise((resolve, reject) => {
			this.db.query('DELETE FROM ?? WHERE ?? = ? and id = ?', [table, column, value, id])
				.then((result) => {
					resolve(result[0].count)
					log.log({ level: 'debug', message: `deleteByIdQuery ${table}`, event: 'sql:deleteByIdQuery' })
				})
				.catch((err) => {
					log.error(`deleteQuery errored with: ${err}`)
					reject(err)
				})
		})
	}


	async selectAllQuery(table, column, value) {
		return new Promise((resolve, reject) => {
			this.db.query('SELECT * FROM ?? WHERE ?? = ?', [table, column, value])
				.then((result) => {
					log.log({ level: 'debug', message: `selectAllQuery ${table}`, event: 'sql:selectAllQuery' })
					resolve(result[0])
				})
				.catch((err) => {
					reject(log.error(`selectAllQuery errored with: ${err}`))
				})
		})
	}

	async selectAllInQuery(table, column, values) {
		return new Promise((resolve, reject) => {
			this.db.query('SELECT * FROM ?? WHERE ?? IN (?)', [table, column, values])
				.then((result) => {
					log.log({ level: 'debug', message: `selectAllInQuery ${table}`, event: 'sql:selectAllInQuery' })
					resolve(result[0])
				})
				.catch((err) => {
					reject(log.error(`selectAllInQuery errored with: ${err}`))
				})
		})
	}

	async addOneQuery(table, addable, column, value) {
		return new Promise((resolve, reject) => {
			this.db.query('update ?? set ?? = ??+1 where ?? = ?', [table, addable, addable, column, value])
				.then(log.log({ level: 'debug', message: `addOneQuery ${table}`, event: 'sql:addOneQuery' }))
				.catch((err) => {
					reject(log.error(`addOneQuery errored with: ${err}`))
				})
		})
	}

	async getColumns(table) {
		return new Promise((resolve, reject) => {
			this.db.query(`select COLUMN_NAME from INFORMATION_SCHEMA.COLUMNS where TABLE_NAME = ? and TABLE_SCHEMA = '${config.db.database}'`, [table])
				.then((result) => {
					const colArray = []
					result[0].forEach((col) => colArray.push(col.COLUMN_NAME))
					resolve(colArray)
					log.log({ level: 'debug', message: `getColumns ${table}`, event: 'sql:getColumns' })
				})
				.catch((err) => {
					reject(log.error(`getColumns errored with: ${err}`))
				})
		})
	}

	getCp(monster, level, ivAttack, ivDefense, ivStamina) {

		const cpMulti = this.cpMultipliers[level]
		const atk = baseStats[monster].attack
		const def = baseStats[monster].defense
		const sta = baseStats[monster].stamina

		const cp = Math.max(10, Math.floor((atk + ivAttack)
			* ((def + ivDefense) ** 0.5)
			* ((sta + ivStamina) ** 0.5)
			* ((cpMulti ** 2) / 10)))
		return cp
	}

	async checkSchema() {
		return new Promise((resolve, reject) => {
			this.db.query(`select count(*) as c from information_schema.tables where table_schema='${config.db.database}'
							and table_name in('egg', 'raid', 'monsters', 'schema_version', 'gym-info', 'humans', 'quest', 'incident')`)
				.then((schematablesMatched) => {
					log.log({ level: 'debug', message: 'checkSchema', event: 'sql:checkSchema' })
					resolve(schematablesMatched[0][0].c)
				})
				.catch((err) => {
					reject(log.error(`schema checker errored with: ${err}`))
				})
		})
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
