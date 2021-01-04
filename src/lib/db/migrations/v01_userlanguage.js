const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('humans', (table) => {
		table.string('language').defaultTo(null)
	})
	log.info('User language migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
