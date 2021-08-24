const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('humans', (table) => {
		table.string('blocked_alerts').nullable()
	})
	log.info('Command security migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
