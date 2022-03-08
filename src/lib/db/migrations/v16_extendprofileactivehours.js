const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	// Add PVP Filtering by Cap
	await knex.schema.alterTable('profiles', (table) => {
		table.string('active_hours', 4096).notNullable().defaultTo('[]').alter()
	})
	log.info('Profile Active Hours Length Migration Applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
