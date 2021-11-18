const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	// add monster index to speed up mon lookup
	await knex.schema.alterTable('monsters', (table) => {
		table.dropIndex(['pokemon_id', 'min_iv'])
		table.index(['pvp_ranking_league', 'pokemon_id', 'min_iv'])
		table.index(['pvp_ranking_league', 'pokemon_id', 'pvp_ranking_worst'])
	})
	log.info('Better (2) monster index migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
