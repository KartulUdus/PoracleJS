const config = require('config')
const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.createTable('nests', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.string('id').notNullable()
		table.foreign('id').references('humans.id').onDelete('CASCADE')
		table.integer('profile_no').notNullable().defaultTo(0)
		table.string('ping').notNullable()
		table.boolean('clean').notNullable().defaultTo(false)
		table.integer('distance').notNullable()
		table.integer('template').notNullable()
		table.integer('pokemon_id').notNullable()
		table.integer('min_spawn_avg').notNullable()
		table.integer('form').notNullable()
		// table.unique(['id', 'profile_no', 'pokemon_id'], 'lure_tracking')
	})

	log.info('Nests migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
