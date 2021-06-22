const config = require('config')
const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') {
		await knex.schema.alterTable('nests', (table) => {
			table.text('template').alter()
		})

		log.info('Nest template type migration applied')
	}
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
