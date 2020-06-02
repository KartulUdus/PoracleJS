const { log } = require('../../logger')
const config = require('config')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('great_league_ranking').notNullable().defaultTo(4096)
		table.integer('great_league_ranking_min_cp').notNullable().defaultTo(0)
		table.integer('ultra_league_ranking').notNullable().defaultTo(4096)
		table.integer('ultra_league_ranking_min_cp').notNullable().defaultTo(0)
		if (config.database.client !== 'sqlite')
			table.dropForeign(['id'])
		table.dropUnique(null, 'monsters_tracking')
		if (config.database.client !== 'sqlite')
			table.foreign('id').references('humans.id').onDelete('CASCADE')
	})
	switch (config.database.client) {
		case 'mysql': {
			await knex.raw(`
				ALTER TABLE monsters
				ADD COLUMN hash BINARY(32) GENERATED ALWAYS AS (MD5(CONCAT(id,'-',pokemon_id,'-',min_iv,'-',max_iv,'-',min_cp,'-',max_cp,'-',min_level,'-',max_level,'-',atk,'-',def,'-',sta,'-',min_weight,'-',max_weight,'-',form,'-',max_atk,'-',max_def,'-',max_sta,'-',gender,'-',great_league_ranking,'-',great_league_ranking_min_cp,'-',ultra_league_ranking,'-',ultra_league_ranking_min_cp,'-'))),
				ADD UNIQUE KEY (hash)
			`)
			break
		}
		default: {
			await knex.schema.alterTable('monsters', (table) => {
				table.unique(['id', 'pokemon_id', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form', 'max_atk', 'max_def', 'max_sta', 'gender', 'great_league_ranking', 'great_league_ranking_min_cp', 'ultra_league_ranking', 'ultra_league_ranking_min_cp'], 'monsters_tracking')
			})
			break
		}
	}
	log.info('PVP migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}