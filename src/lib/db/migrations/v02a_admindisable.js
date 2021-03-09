const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('humans', (table) => {
		table.dateTime('disabled_date').nullable().alter()
	})

	await knex.table('humans').update({ disabled_date: null })

	log.info('Admin disable migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}