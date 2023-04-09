const config = require('config')
const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.createTable('forts', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.string('id').notNullable()
		table.foreign('id').references('humans.id').onDelete('CASCADE')
		table.integer('profile_no').notNullable().defaultTo(1)
		table.string('ping').notNullable()
		table.integer('distance').notNullable()
		table.integer('template').notNullable()

		//table.unique(['id', 'profile_no', 'lure_id'], 'fort_tracking')
	})

	log.info('Fort watcher migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
