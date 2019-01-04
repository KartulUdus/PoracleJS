const Controller = require('./controller')

class ComDay extends Controller {

/*
* monsterWhoCares, takes data object
*/
	async findActiveComEvent() {
		return new Promise((resolve) => {
			this.db.query('SELECT * FROM comevent WHERE end_timestamp > now() and finished = false')
				.then((result) => {
					resolve(result)
				})
				.catch((err) => {
					this.log.error(`findActiveComEvent errored with: ${err}`)
				})
		})
	}

	async findExpiredComEvent() {
		return new Promise((resolve) => {
			this.db.query('SELECT * FROM comevent WHERE end_timestamp < now() and finished = false')
				.then((result) => {
					resolve(result)
				})
				.catch((err) => {
					this.log.error(`findExpiredComEvent errored with: ${err}`)
				})
		})
	}


	async getComEventResults(monsterId, eventStart) {
		return new Promise((resolve) => {
			const query = `
				SELECT @n := @n + 1 n, discord_id, (max(seen) - min(seen)) seen, (max(caught) - min(caught)) caught, (max(lucky) - min(lucky)) lucky 
				FROM comsubmission, (SELECT @n := 0) m
				WHERE monster_id=${monsterId} 
				AND (submit_timestamp BETWEEN '${eventStart}' AND now())
				GROUP BY discord_id
				ORDER BY caught DESC`
			this.db.query(query)
				.then((result) => {
					resolve(result)
				})
				.catch((err) => {
					this.log.error(`getComEventResults errored with: ${err}`)
				})
		})
	}

}

module.exports = ComDay