class GolbatScanner {
	constructor(db) {
		this.dbs = db
	}

	// eslint-disable-next-line camelcase
	async getGymName(gym_id) {
		try {
			for (const db of this.dbs) {
				const row = await db.select('name')
					.from('gym')
					// eslint-disable-next-line camelcase
					.where({ id: gym_id })
					.first()
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
				const row = await db.select('name')
					.from('pokestop')
					// eslint-disable-next-line camelcase
					.where({ id: pokestop_id })
					.first()
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
				const pokestopRows = await db.select('lat', 'lon')
					.from('pokestop')
					.whereBetween('lat', [minLat, maxLat])
					.whereBetween('lon', [minLon, maxLon])
					.where({ deleted: 0 })
					.where({ enabled: 1 })
				const gymRows = await db.select('lat', 'lon', 'team_id', 'available_slots')
					.from('gym')
					.whereBetween('lat', [minLat, maxLat])
					.whereBetween('lon', [minLon, maxLon])
					.where({ deleted: 0 })
					.where({ enabled: 1 })

				stopDetails.push(...pokestopRows.map((x) => ({
					latitude: x.lat,
					longitude: x.lon,
					type: 'stop',
				})))

				stopDetails.push(...gymRows.map((x) => ({
					latitude: x.lat,
					longitude: x.lon,
					type: 'gym',
					teamId: x.team_id,
					slots: x.available_slots,
				})))
			}
			return stopDetails
		} catch (err) {
			throw { source: 'getStopData', error: err }
		}
	}
}

module.exports = GolbatScanner
