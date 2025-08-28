const config = require('config')
const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.createTable('maxbattle', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.string('id').notNullable()
		table.foreign('id').references('humans.id').onDelete('CASCADE')
		table.integer('profile_no').notNullable().defaultTo(1)
		table.string('ping').notNullable()
		table.boolean('clean').notNullable().defaultTo(false)
		table.integer('pokemon_id').notNullable()
		table.boolean('gmax').defaultTo(false)
		table.text('template').notNullable()
		table.integer('distance').notNullable()
		table.integer('level').notNullable()
		table.integer('form').notNullable()
		table.integer('move').notNullable().defaultTo(9000)
		table.integer('evolution').notNullable().defaultTo(9000)
		table.string('station_id').nullable()

		// table.unique(['id', 'pokemon_id', 'gmax', 'level'], 'maxbattle_tracking')
	})

	log.info('MaxBattle migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
