const log = require('../logger');
const config = require('config');
const inside = require('point-in-polygon');
const _ = require('lodash');
const NodeGeocoder = require('node-geocoder');
const pcache = require('persistent-cache');
const geofence = require(config.geocoding.geofence)
const baseStats = require("../util/base_stats");
const cp_multipliers = require("../util/cp-multipliers");

// Init the chosen geocoder
const geocoder = (() => {
	switch(config.geocoding.provider.toLowerCase()){
		case "osm":{
			return NodeGeocoder({
				provider: 'openstreetmap',
				formatterPattern: config.locale.addressformat,
			});
		}
		case "google":{
			return NodeGeocoder({
				provider: 'google',
				httpAdapter: 'https',
				apiKey: _.sample(config.geocoding.googleKey),
			});
		}
	}
})()
// setup geocoding cache

const addrCache = pcache({
	base: '.cache',
	name: 'addrCache',
	duration: 30 * 24 * 3600 * 1000, // 30 days is what google allows
});

class Controller{

	constructor(db, log) {
		this.db = db;
		this.log = log;
	}

// Geocoding stuff below


	async geolocate(locationString) {
		return new Promise(resolve => {
			geocoder.geocode(locationString)
				.then(function(result){
					resolve(result);
					log.debug(`Geolocate provided result ${JSON.stringify(result)}`)
				})
				.catch((err) => {log.error(`Geolocate failed with error: ${err}`)})
		});
	}

	async getAddress(locationObject) {
		return new Promise(resolve => {
			const cacheKey = `${locationObject.lat}-${locationObject.lon}`;
			const res = {}
			addrCache.get(cacheKey, (err, addr) => {
				if (err) log.error(err);
				if (!addr) {
					log.debug(`making geocode requerst and caching results`)
					geocoder.reverse(locationObject)
						.then(function(geocodeResult){
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
							res.zipcode = geocodeResult[0].zipcode || ''
							res.country = geocodeResult[0].country || ''
							res.countryCode = geocodeResult[0].countryCode || ''
							res.city = geocodeResult[0].city || ''
							res.state = geocodeResult[0].state || ''
							res.stateCode = geocodeResult[0].stateCode || ''

							if (res && geocodeResult.length > 0) {
								addrCache.put(cacheKey, res, (error, r) => {
									if (error) log.error(`Error saving addr of ${cacheKey}: ${error}`);
								})
							}
						log.debug(`fetched address ${JSON.stringify(res)}`)

						resolve(res)
						})
						.catch((err) => {log.error(`GetAddress failed with error: ${err}`)})
				}
				else{
					resolve(addr)
				}
			})
		})
	}


	async pointInArea(point) {
		return new Promise(resolve => {
			const confAreas = geofence.map(area => area.name.toLowerCase())
			let matchAreas = []
			confAreas.forEach((area) => {
				const areaObj = _.find(geofence, path => path.name.toLowerCase() === area)
				if (inside(point, areaObj.path)) {
					matchAreas.push(area)
				}
			})
			resolve(matchAreas)
		})
	}

	// DB queries



	async updateLocation(table, lat, lon, col, value) {
		return new Promise(resolve => {
			this.db.query('UPDATE ?? set latitude = ?, longitude = ? where ?? = ?', [table, lat, lon, col, value])
				.then(
					log.debug(`updated location for ${table}`)
				)
				.catch((err) => {log.error(`updateLocation errored with: ${err}`)})
		})
	}

	async selectOneQuery(table, column, value) {
		return new Promise(resolve => {
			this.db.query('SELECT * FROM ?? WHERE ?? = ?', [table, column, value])
				.then(
					function(result){
						resolve(result[0][0])
					}
				)
				.catch((err) => {log.error(`selectOneQuery errored with: ${err}`)})
		})
	}

	async countQuery(what, from, where, value) {
		return new Promise(resolve => {
			this.db.query('SELECT count(??) as count FROM ?? WHERE ?? = ?', [what, from, where, value])
				.then(
					(result) => {
						resolve(result[0][0].count)
					}
				)
				.catch((err) => {log.error(`countQuery errored with: ${err}`)})
		})
	}

	async insertQuery(table, columns, values) {
		return new Promise(resolve => {
			this.db.query(`INSERT INTO ?? (${columns.join(',')}) VALUES (?)`, [table, values])
				.then(
					log.debug(`Inserted to ${table}`)
				)
				.catch((err) => {log.error(`inseertQuery errored with: ${err}`)})
		})
	}


	async insertOrUpdateQuery(table, columns, values) {

		const cols = columns.join(', ');
		const placeholders = values.join(', ');
		const duplicate = columns.map(x => `\`${x}\`=VALUES(\`${x}\`)`).join(', ');
		const query = `INSERT INTO ${table} (${cols})
                      VALUES (${placeholders})
                      ON DUPLICATE KEY UPDATE ${duplicate}`;
		return new Promise(resolve => {
			log.debug(`constructed query for insertOrUpdateQuery: \n${query}`)
			this.db.query(query)
				.then((result) => {
						log.debug(`Inserted or maybe updated ${table}`)
						resolve(result)
				})
				.catch((err) => {log.error(`insertOrUpdateQuery errored with: ${err}`)})
		})
	}


	async updateQuery(table, field, newvalue, col, value) {
		return new Promise(resolve => {
			this.db.query('UPDATE ?? SET ?? = ? where ?? = ?', [table, field, newvalue, col, value])
				.then(
					log.debug(`Inserted to ${table}`)
				)
				.catch((err) => {log.error(`inseertQuery errored with: ${err}`)})
		})
	}


	async mysteryQuery(query) {
		return new Promise(resolve => {
			this.db.query(query)
				.then(() => {
					log.debug(`Mystery query executed`)
					resolve()
				})
				.catch((err) => {log.error(`mysteryQuery errored with: ${err}`)})
		})
	}

	async deleteQuery(table, column, value) {
		return new Promise(resolve => {
			this.db.query('DELETE FROM ?? WHERE ?? = ?', [table, column, value])
				.then(
					function(result){
						resolve(result[0].count)
						log.debug(`Deleted ${result.affectedRows} from ${table}`)
					}
				)
				.catch((err) => {log.error(`deleteQuery errored with: ${err}`)})
		})
	}

	async deleteByIdQuery(table, column, value, id) {
		return new Promise(resolve => {
			this.db.query('DELETE FROM ?? WHERE ?? = ? and id = ?', [table, column, value, id])
				.then(
					function(result){
						resolve(result[0].count)
						log.debug(`Deleted ${result.affectedRows} from ${table}`)
					}
				)
				.catch((err) => {log.error(`deleteQuery errored with: ${err}`)})
		})
	}


	async selectAllQuery(table, column, value) {
		return new Promise(resolve => {
			this.db.query('SELECT * FROM ?? WHERE ?? = ?', [table, column, value])
				.then(
					function(result){
						resolve(result[0])
					}
				)
				.catch((err) => {log.error(`selectAllQuery errored with: ${err}`)})
		})
	}

	async addOneQuery(table, addable, column, value) {
		return new Promise(resolve => {
			this.db.query('update ?? set ?? = ??+1 where ?? = ?', [table, addable, addable, column, value])
				.then(
					log.debug(`Added one to ${table}.${addable}`)
				)
				.catch((err) => {log.error(`addOneQuery errored with: ${err}`)})
		})
	}

	async getCp(monster, level, ivAttack, ivDefense, ivStamina) {
		return new Promise(resolve => {
			let cp_multi = cp_multipliers[level];
			let atk = baseStats[monster].attack;
			let def = baseStats[monster].defense;
			let sta = baseStats[monster].stamina;

			let cp = Math.max(10 ,Math.floor(
				(atk + ivAttack) *
				Math.pow(def + ivDefense, 0.5) *
				Math.pow(sta + ivStamina, 0.5) *
				Math.pow(cp_multi, 2) /	10
				))
			resolve(cp)
		})
	}
	async checkSchema() {
		return new Promise(resolve => {
			this.db.query(`select count(*) as c from information_schema.tables where table_schema='${config.db.database}' 
							and table_name in('egg', 'raid', 'monsters', 'schema_version', 'gym-info', 'humans', 'quest', 'comevent', 'comsubmission')`)
				.then((schematablesMatched) => {
					resolve(schematablesMatched[0][0].c)
				})
				.catch((err) => {log.error(`schema checker errored with: ${err}`)})
		})
	}

}








module.exports = Controller