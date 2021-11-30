const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	// Add PVP Filtering by Cap
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('pvp_ranking_cap').notNullable().defaultTo(0)
	})
	log.info('Cap Filtering Migration Applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
