const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('raid', (table) => {
		table.integer('move').notNullable().defaultTo(0)
		table.integer('evolution').notNullable().defaultTo(9000)
		table.string('gym_id').nullable()
	})
	log.info('Raid specific gym migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
