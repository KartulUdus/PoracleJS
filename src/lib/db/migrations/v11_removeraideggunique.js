const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('raid', (table) => {
		table.dropForeign(['id'])
	})

	try {
		await knex.raw('ALTER TABLE raid DROP constraint raid_tracking')
	} catch {
		log.info('Database did not have unique constraint')
	}
	await knex.schema.alterTable('raid', (table) => {
		table.foreign('id').references('humans.id').onDelete('CASCADE')
	})
	log.info('Raid unique constraint removal migration completed')

	await knex.schema.alterTable('egg', (table) => {
		table.dropForeign(['id'])
	})

	try {
		await knex.raw('ALTER TABLE egg DROP constraint egg_tracking')
	} catch {
		log.info('Database did not have unique constraint')
	}
	await knex.schema.alterTable('egg', (table) => {
		table.foreign('id').references('humans.id').onDelete('CASCADE')
	})
	log.info('Egg unique constraint removal migration completed')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
