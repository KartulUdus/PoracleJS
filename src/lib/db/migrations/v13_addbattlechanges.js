const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('gym', (table) => {
		table.boolean('battle_changes').notNullable().defaultTo(0)
	})
	log.info('Add battle changes migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}