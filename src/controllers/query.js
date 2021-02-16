class Query {
	constructor(log, db, config) {
		this.db = db
		this.config = config
		this.log = log
	}

	// database methods below

	async selectOneQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).where(conditions).first()
		} catch (err) {
			throw { source: 'selectOneQuery', error: err }
		}
	}

	async selectAllQuery(table, conditions) {
		try {
			return await this.db.select('*').from(table).where(conditions)
		} catch (err) {
			throw { source: 'selectAllQuery', error: err }
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
			return this.db.whereIn(valuesColumn, values).where({ id }).from(table).del()
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
					monsters: 'monsters.id, monsters.pokemon_id, monsters.min_iv, monsters.max_iv, monsters.min_level, monsters.max_level, monsters.atk, monsters.def, monsters.sta, monsters.form, monsters.gender, monsters.min_weight, monsters.great_league_ranking, monsters.great_league_ranking_min_cp, monsters.ultra_league_ranking, monsters.ultra_league_ranking_min_cp',
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
}

module.exports = Query
