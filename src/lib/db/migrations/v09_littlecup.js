const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('little_league_ranking').notNullable().defaultTo(4096)
		table.integer('little_league_ranking_min_cp').notNullable().defaultTo(4096)
		table.integer('little_league_ranking_highest').notNullable().defaultTo(1)
		table.integer('great_league_ranking_highest').notNullable().defaultTo(1)
		table.integer('ultra_league_ranking_highest').notNullable().defaultTo(1)
	})
	log.info('Little cup migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
