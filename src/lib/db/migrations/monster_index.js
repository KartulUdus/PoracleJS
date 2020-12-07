const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	// add monster index to speed up mon lookup
	await knex.schema.alterTable('monsters', (table) => {
		table.index('pokemon_id')
	})
	log.info('Monster index migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
