const config = require('config')
const { log } = require('../../logger')

exports.up = async function migrationUp(knex) {
	await knex.schema.alterTable('humans', (table) => {
		table.boolean('admin_disable').notNullable().defaultTo(false)
		table.dateTime('disabled_date').notNullable().defaultTo('2021-01-01 00:00')
		table.integer('current_profile_no').notNullable().defaultTo(1)
	})

	// monsters_tracking key: removed: max_weight, max_atk, max_def, max_sta; added: ^ 4 cols above
	await knex.schema.alterTable('monsters', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.integer('profile_no').notNullable().defaultTo(1)
		table.integer('min_time').notNullable().defaultTo(0)

		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.dropForeign(['id'])
		table.dropUnique(null, 'monsters_tracking')
		table.unique([
			'id', 'profile_no', 'pokemon_id', 'min_iv', 'max_iv', 'min_level', 'max_level', 'atk', 'def', 'sta', 'form', 
			'great_league_ranking', 'great_league_ranking_min_cp', 'ultra_league_ranking', 'ultra_league_ranking_min_cp', 'min_time',
		], 'monsters_tracking')
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.foreign('id').references('humans.id').onDelete('CASCADE')
	})

	await knex.schema.alterTable('raid', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.integer('profile_no').notNullable().defaultTo(1)

		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.dropForeign(['id'])
		table.dropUnique(null, 'raid_tracking')
		table.unique(['id', 'profile_no', 'pokemon_id', 'exclusive', 'level', 'team'], 'raid_tracking')
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.foreign('id').references('humans.id').onDelete('CASCADE')
	})

	await knex.schema.alterTable('egg', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.integer('profile_no').notNullable().defaultTo(1)

		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.dropForeign(['id'])
		table.dropUnique(null, 'egg_tracking')
		table.unique(['id', 'profile_no', 'team', 'exclusive', 'level'], 'egg_tracking')
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.foreign('id').references('humans.id').onDelete('CASCADE')
	})

	await knex.schema.alterTable('quest', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.integer('profile_no').notNullable().defaultTo(1)

		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.dropForeign(['id'])
		table.dropUnique(null, 'quest_tracking')
		table.unique(['id', 'profile_no', 'reward_type', 'reward'], 'quest_tracking')
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.foreign('id').references('humans.id').onDelete('CASCADE')
	})

	await knex.schema.alterTable('invasion', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.integer('profile_no').notNullable().defaultTo(1)

		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.dropForeign(['id'])
		table.dropUnique(null, 'invasion_tracking')
		table.unique(['id', 'profile_no', 'gender', 'grunt_type'], 'invasion_tracking')
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.foreign('id').references('humans.id').onDelete('CASCADE')
	})

	await knex.schema.alterTable('weather', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.integer('profile_no').notNullable().defaultTo(1)

		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.dropForeign(['id'])
		table.dropUnique(null, 'weather_tracking')
		table.unique(['id', 'profile_no', 'condition', 'cell'], 'weather_tracking')
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.foreign('id').references('humans.id').onDelete('CASCADE')
	})

	await knex.schema.createTable('profiles', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.string('id').notNullable()
		table.foreign('id').references('humans.id').onDelete('CASCADE')
		table.integer('profile_no').notNullable().defaultTo(1)
		table.string('name').notNullable()
		table.text('area').notNullable().defaultTo('[]')
		table.float('latitude', 14, 10).notNullable().defaultTo(0)
		table.float('longitude', 14, 10).notNullable().defaultTo(0)
		table.string('active_hours').notNullable().defaultTo('[]')
		table.unique(['id', 'profile_no'], 'profile_unique')
	})

	await knex.schema.createTable('lures', (table) => {
		if (config.database.client !== 'sqlite' && config.database.client !== 'sqlite3') table.increments('uid')
		table.string('id').notNullable()
		table.foreign('id').references('humans.id').onDelete('CASCADE')
		table.integer('profile_no').notNullable().defaultTo(0)
		table.string('ping').notNullable()
		table.boolean('clean').notNullable().defaultTo(false)
		table.integer('distance').notNullable()
		table.integer('template').notNullable()
		table.integer('lure_id').notNullable()
		table.unique(['id', 'profile_no', 'lure_id'], 'lure_tracking')
	})

	log.info('Profiles & Lures migration applied')
}

exports.down = async function migrationDown(knex) {
	log.info(knex)
}
