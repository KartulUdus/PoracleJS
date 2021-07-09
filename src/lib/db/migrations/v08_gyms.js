const config = require('config')
const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.createTable('gym', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.string('id').notNullable()
		table.foreign('id').references('humans.id').onDelete('CASCADE')
		table.integer('profile_no').notNullable().defaultTo(1)
		table.string('ping').notNullable()
		table.boolean('clean').notNullable().defaultTo(false)
		table.integer('distance').notNullable()
		table.text('template').notNullable()
		table.integer('team').notNullable()
		table.boolean('slot_changes').notNullable()
		table.string('gym_id').nullable()
	})

	log.info('Gym migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
