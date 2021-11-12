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

	async getStopData(aLat, aLon, bLat, bLon) {
		const minLat = Math.min(aLat, bLat)
		const minLon = Math.min(aLon, bLon)
		const maxLat = Math.max(aLat, bLat)
		const maxLon = Math.max(aLon, bLon)

		try {
			const pokestopRows = await this.db.select('lat', 'lon').from('pokestop').whereBetween('lat', [minLat, maxLat]).whereBetween('lon', [minLon, maxLon])
			const gymRows = await this.db.select('lat', 'lon', 'team_id', 'availble_slots').from('gym').whereBetween('lat', [minLat, maxLat]).whereBetween('lon', [minLon, maxLon])

			return [
				...pokestopRows.map((x) => ({ latitude: x.lat, longitude: x.lon, type: 'pokestop' })),
				...gymRows.map((x) => ({
					latitude: x.lat, longitude: x.lon, type: 'gym', teamId: x.team_id, slots: x.availble_slots,
				})),
			]
		} catch (err) {
			throw { source: 'getStopData', error: err }
		}
	}
}

module.exports = RdmScanner