class MadScanner {
	constructor(db) {
		this.dbs = db
	}

	// eslint-disable-next-line camelcase
	async getGymName(gym_id) {
		try {
			for (const db of this.dbs) {
				// eslint-disable-next-line camelcase
				const row = await db.select('name').from('gymdetails').where({ gym_id }).first()
				if (row) return row.name
			}
			return null
		} catch (err) {
			throw { source: 'getGymName', error: err }
		}
	}

	// eslint-disable-next-line camelcase
	async getPokestopName(pokestop_id) {
		try {
			for (const db of this.dbs) {
				// eslint-disable-next-line camelcase
				const row = await db.select('name').from('pokestop').where({ pokestop_id }).first()
				if (row) return row.name
			}
			return null
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
			const stopDetails = []
			for (const db of this.dbs) {
				const pokestopRows = await db.select('latitude', 'longitude')
					.from('pokestop')
					.whereBetween('latitude', [minLat, maxLat])
					.whereBetween('longitude', [minLon, maxLon])
				const gymRows = await db.select('latitude', 'longitude', 'team_id', 'slots_available')
					.from('gym')
					.whereBetween('latitude', [minLat, maxLat])
					.whereBetween('longitude', [minLon, maxLon])

				stopDetails.push(...pokestopRows.map((x) => ({
					latitude: x.latitude,
					longitude: x.longitude,
					type: 'stop',
				})))

				stopDetails.push(...gymRows.map((x) => ({
					latitude: x.latitude,
					longitude: x.longitude,
					type: 'gym',
					teamId: x.team_id,
					slots: x.slots_available,
				})))
			}
			return stopDetails
		} catch (err) {
			throw { source: 'getStopData', error: err }
		}
	}
}

module.exports = MadScanner