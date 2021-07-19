const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('monsters', (table) => {
		table.integer('pvp_ranking_worst').notNullable().defaultTo(4096)
		table.integer('pvp_ranking_best').notNullable().defaultTo(1)
		table.integer('pvp_ranking_min_cp').notNullable().defaultTo(1)
		table.integer('pvp_ranking_league').notNullable().defaultTo(0)
	})

	await knex.raw('update monsters set pvp_ranking_league = 1500, pvp_ranking_worst = great_league_ranking, pvp_ranking_min_cp = great_league_ranking_min_cp where great_league_ranking < 4096;')
	await knex.raw('update monsters set pvp_ranking_league = 2500, pvp_ranking_worst = ultra_league_ranking, pvp_ranking_min_cp = ultra_league_ranking_min_cp where ultra_league_ranking < 4096;')

	log.info('PVP2 migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
