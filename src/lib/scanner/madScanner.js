class MadScanner {
	constructor(db) {
		this.db = db
	}

	// eslint-disable-next-line camelcase
	async getGymName(gym_id) {
		try {
			const row = await this.db.select('name').from('gymdetails').where({ gym_id }).first()
			return row ? row.name : null
		} catch (err) {
			throw { source: 'getGymName', error: err }
		}
	}

	// eslint-disable-next-line camelcase
	async getPokestopName(pokestop_id) {
		try {
			const row = await this.db.select('name').from('pokestop').where({ pokestop_id }).first()
			return row ? row.name : null
		} catch (err) {
			throw { source: 'getPokestopName', error: err }
		}
	}
}

module.exports = MadScanner