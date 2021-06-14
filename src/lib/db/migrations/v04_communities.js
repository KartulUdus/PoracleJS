const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('humans', (table) => {
		table.text('community_membership').notNullable().defaultTo('[]')
		table.text('area_restriction').nullable()
		table.string('notes').notNullable().defaultTo('')
	})
	log.info('Communities migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
