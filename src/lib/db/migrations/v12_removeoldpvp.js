const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.dropColumn('great_league_ranking')
		table.dropColumn('great_league_ranking_min_cp')
		table.dropColumn('ultra_league_ranking')
		table.dropColumn('ultra_league_ranking_min_cp')
	})

	log.info('PVP2 migration cleanup applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
