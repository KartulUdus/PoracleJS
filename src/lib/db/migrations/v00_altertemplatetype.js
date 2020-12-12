const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.text('template').alter()
	})
	await knex.schema.alterTable('raid', (table) => {
		table.text('template').alter()
	})
	await knex.schema.alterTable('egg', (table) => {
		table.text('template').alter()
	})
	await knex.schema.alterTable('quest', (table) => {
		table.text('template').alter()
	})
	await knex.schema.alterTable('invasion', (table) => {
		table.text('template').alter()
	})
	log.info('Template type migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
