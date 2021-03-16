const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('rarity').notNullable().defaultTo(-1)
		table.integer('max_rarity').notNullable().defaultTo(6)
	})
	log.info('Monster rarity migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
