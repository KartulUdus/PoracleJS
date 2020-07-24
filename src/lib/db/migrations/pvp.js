const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('great_league_ranking').notNullable().defaultTo(4096)
		table.integer('great_league_ranking_min_cp').notNullable().defaultTo(0)
		table.integer('ultra_league_ranking').notNullable().defaultTo(4096)
		table.integer('ultra_league_ranking_min_cp').notNullable().defaultTo(0)
	})
	log.info('PVP migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}