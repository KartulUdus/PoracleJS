class RdmScanner {
	constructor(db) {
		this.db = db
	}

	// eslint-disable-next-line camelcase
	async getGymName(gym_id) {
		try {
			const row = await this.db.select('name').from('gym').where({ id: gym_id }).first()
			return row ? row.name : null
		} catch (err) {
			throw { source: 'getGymName', error: err }
		}
	}

	// eslint-disable-next-line camelcase
	async getPokestopName(pokestop_id) {
		try {
			const row = await this.db.select('name').from('pokestop').where({ id: pokestop_id }).first()
			return row ? row.name : null
		} catch (err) {
			throw { source: 'getPokestopName', error: err }
		}
	}
}

module.exports = RdmScanner