const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('egg', (table) => {
		table.string('gym_id').nullable()
	})
	log.info('Egg specific gym migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
