const { log } = require('../../logger')
const config = require('config')

exports.up = async function migrationUp(knex) {

	// monsters_tracking key: removed: max_weight, max_atk, max_def, max_sta; added: ^ 4 cols above
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('great_league_ranking').notNullable().defaultTo(4096)
		table.integer('great_league_ranking_min_cp').notNullable().defaultTo(0)
		table.integer('ultra_league_ranking').notNullable().defaultTo(4096)
		table.integer('ultra_league_ranking_min_cp').notNullable().defaultTo(0)
		if (config.database.client !== 'sqlite')
			table.dropForeign(['id'])
		table.dropUnique(null, 'monsters_tracking')
		table.unique([
			'id', 'pokemon_id', 'min_iv', 'max_iv', 'min_level', 'max_level', 'atk', 'def', 'sta', 'form', 'gender', 'min_weight',
			'great_league_ranking', 'great_league_ranking_min_cp', 'ultra_league_ranking', 'ultra_league_ranking_min_cp',
		], 'monsters_tracking')
		if (config.database.client !== 'sqlite')
			table.foreign('id').references('humans.id').onDelete('CASCADE')
	})
	log.info('PVP migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}