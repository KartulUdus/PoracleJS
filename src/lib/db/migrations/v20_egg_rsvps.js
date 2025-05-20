const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('egg', (table) => {
		table.tinyint('rsvp_changes', 8).notNullable().defaultTo(0)
	})
	log.info('Rsvp egg migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
