const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	// add monster index to speed up mon lookup
	await knex.schema.alterTable('monsters', (table) => {
		table.dropIndex('pokemon_id')
		table.index(['pokemon_id', 'min_iv'])
	})
	log.info('Better monster index migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
