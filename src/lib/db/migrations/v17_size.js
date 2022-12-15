const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('size').notNullable().defaultTo(-1)
		table.integer('max_size').notNullable().defaultTo(5)
	})
	log.info('Monster size migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
