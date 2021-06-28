const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('quest', (table) => {
		table.dropForeign(['id'])
	})

	try {
		await knex.raw('ALTER TABLE quest DROP constraint quest_tracking')
	} catch {
		log.info('Database did not have unique constraint')
	}
	await knex.schema.alterTable('quest', (table) => {
		table.foreign('id').references('humans.id').onDelete('CASCADE')
	})
	log.info('Quest unique constraint removal migration completed')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
