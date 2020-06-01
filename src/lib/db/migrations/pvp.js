const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('great_league_ranking').notNullable().defaultTo(4096)
		table.integer('great_league_ranking_min_cp').notNullable().defaultTo(0)
		table.integer('ultra_league_ranking').notNullable().defaultTo(4096)
		table.integer('ultra_league_ranking_min_cp').notNullable().defaultTo(0)
		table.dropUnique(null, 'monsters_tracking')
		table.unique(['id', 'pokemon_id', 'min_iv', 'max_iv', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form', 'max_atk', 'max_def', 'max_sta', 'gender', 'great_league_ranking', 'great_league_ranking_min_cp', 'ultra_league_ranking', 'ultra_league_ranking_min_cp'], 'monsters_tracking')
	})

	log.info('PVP migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
