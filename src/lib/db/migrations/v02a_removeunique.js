const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.dropForeign(['id'])
	})

	try {
		await knex.raw('ALTER TABLE monsters DROP constraint monsters_tracking')
	} catch {
		log.info('Database did not have unique constraint')
	}
	await knex.schema.alterTable('monsters', (table) => {
		table.foreign('id').references('humans.id').onDelete('CASCADE')
	})
	log.info('Unique constraint removal migration completed')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
