const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.boolean('verified_only').notNullable().defaultTo(false)
	})
	log.info('Monster verified_only migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
