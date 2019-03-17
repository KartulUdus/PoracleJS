const Controller = require('../controllers/controller')
const config = require('config')
const mysql = require('mysql2/promise')

const db = mysql.createPool(config.db, { multipleStatements: true })
const queries = new Controller(db)
const log = require('../logger')

const gymInfo = `CREATE TABLE \`gym-info\` (
  \`id\` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  \`park\` tinyint(1) NOT NULL DEFAULT 0,
  \`gym_name\` longtext COLLATE utf8_unicode_ci,
  \`description\` longtext COLLATE utf8_unicode_ci,
  \`url\` varchar(191) COLLATE utf8_unicode_ci DEFAULT NULL,
  \`latitude\` double NOT NULL,
  \`longitude\` double NOT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`geocoded_park\` (\`park\`),
  KEY \`geocoded_latitude_longitude\` (\`latitude\`,\`longitude\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const humans = `CREATE TABLE \`humans\` (
  \`id\` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`name\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`alerts_sent\` int(11) NOT NULL DEFAULT 0,
  \`enabled\` tinyint(1) NOT NULL DEFAULT 1,
  \`area\` TEXT NOT NULL,
  \`latitude\` double DEFAULT 0,
  \`longitude\` double DEFAULT 0,
  PRIMARY KEY (\`id\`),
  KEY \`humans_name\` (\`name\`),
  KEY \`humans_alerts_sent\` (\`alerts_sent\`),
  KEY \`humans_latitude_longitude\` (\`latitude\`,\`longitude\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`

const monsters = `CREATE TABLE \`monsters\` (
  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`pokemon_id\` smallint(6) NOT NULL,
  \`distance\` int(11) NOT NULL,
  \`min_iv\` smallint(3) NOT NULL,
  \`max_iv\` smallint(3) NOT NULL,
  \`min_cp\` smallint(6) NOT NULL,
  \`max_cp\` smallint(6) NOT NULL,
  \`min_level\` smallint(2) NOT NULL,
  \`max_level\` smallint(2) NOT NULL,
  \`atk\` smallint(2) NOT NULL,
  \`def\` smallint(2) NOT NULL,
  \`sta\` smallint(2) NOT NULL,
  \`template\` smallint(5) DEFAULT 3,
  \`min_weight\` double NOT NULL,
  \`max_weight\` double NOT NULL,
  \`form\` smallint(3) DEFAULT 0,
  PRIMARY KEY monsters_tracking (\`id\`, \`pokemon_id\`, \`min_iv\`, \`max_iv\`, \`min_cp\`, \`max_cp\`, \`min_level\`, \`max_level\`, \`atk\`, \`def\`, \`sta\`, \`min_weight\`, \`max_weight\`, \`form\`),
  KEY \`monsters_pokemon_id\` (\`pokemon_id\`),
  KEY \`monsters_distance\` (\`distance\`),
  KEY \`monsters_min_iv\` (\`min_iv\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const raid = `
CREATE TABLE \`raid\` (
  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`pokemon_id\` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  \`park\` tinyint(1) NOT NULL,
 \`template\` smallint(5) DEFAULT 3,
  \`distance\` int(11) NOT NULL,
  \`team\` smallint(1) DEFAULT 4,
  \`level\` smallint(1) DEFAULT 0,
  PRIMARY KEY raid_tracking (\`id\`, \`pokemon_id\`, \`park\`, \`level\`),
  KEY \`raid_pokemon_id\` (\`pokemon_id\`),
  KEY \`raid_distance\` (\`distance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const egg = `CREATE TABLE \`egg\` (
  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`raid_level\` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  \`park\` tinyint(1) NOT NULL,
 \`template\` smallint(5) DEFAULT 3,
  \`distance\` int(11) NOT NULL,
  \`team\` smallint(1) DEFAULT 4,
  PRIMARY KEY egg_tracking (\`id\`, \`raid_level\`),
  KEY \`raid_level\` (\`raid_level\`),
  KEY \`raid_distance\` (\`distance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const schemaVersion = `CREATE TABLE \`schema_version\` (
  \`key\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  \`val\` smallint(6) NOT NULL,
  PRIMARY KEY (\`key\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const quest = `
CREATE TABLE \`quest\` (
  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`reward\` int(11) NOT NULL DEFAULT 0,
  \`template\` smallint(5) DEFAULT 3,
  \`shiny\` int(1) NOT NULL DEFAULT 0,
  \`reward_type\` int(11) NOT NULL DEFAULT 0,
  \`distance\` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY quest_tracking (\`id\`, \`reward_type\`, \`reward\`),
  KEY \`distance\` (\`distance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`


const migration3 = {
	quest: `
		ALTER TABLE \`quest\` 
		ADD \`shiny\` smallint(1) NOT NULL DEFAULT 0;
	`,
}

const migration4 = {
	id: {
		monsters: `ALTER TABLE \`monsters\`
			MODIFY COLUMN \`id\` varchar(191) COLLATE utf8_unicode_ci NOT NULL;`,
		egg: `ALTER TABLE \`egg\`
			MODIFY COLUMN \`id\` varchar(191) COLLATE utf8_unicode_ci NOT NULL;`,
		raid: `ALTER TABLE \`raid\`
			MODIFY COLUMN \`id\` varchar(191) COLLATE utf8_unicode_ci NOT NULL;`,
		quest: `		ALTER TABLE \`quest\`
			MODIFY COLUMN \`id\` varchar(191) COLLATE utf8_unicode_ci NOT NULL;`,
	},
	monsters: `
		ALTER TABLE \`monsters\`
			ADD \`maxAtk\` smallint(2) NOT NULL DEFAULT 16,
			ADD \`maxDef\` smallint(2) NOT NULL DEFAULT 16,
			ADD \`maxSta\` smallint(2) NOT NULL DEFAULT 16,
			ADD \`gender\` smallint(2) NOT NULL DEFAULT 0
	`,
	raid: `
		ALTER TABLE \`raid\`
			ADD \`form\` smallint(3) NOT NULL DEFAULT 0;
	`,
}


module.exports = async () => new Promise((resolve, reject) => {
	queries.countQuery('TABLE_NAME', 'information_schema.tables', 'table_schema', config.db.database)
		.then((tables) => {
			if (!tables) {
				Promise.all([
					queries.mysteryQuery(humans),
					queries.mysteryQuery(gymInfo),
					queries.mysteryQuery(monsters),
					queries.mysteryQuery(raid),
					queries.mysteryQuery(quest),
					queries.mysteryQuery(egg),
					queries.mysteryQuery(schemaVersion),
				])
					.then(() => {
						queries.insertQuery('schema_version', ['`key`', '`val`'], ['db_version', '4'])
							.then(() => {
								log.info('Database tables created, db_version 4 applied')
								resolve(true)
							})
							.catch((unhappy) => {
								reject(log.error(`migration unhappy with ${unhappy.message}`))
							})
					})
					.catch((unhappy) => {
						reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
					})
			}
			else {
				queries.checkSchema()
					.then((confirmedTables) => {
						if (confirmedTables === 7) {
							log.info('Database tables confirmed')
						}
						else {
							reject(log.error(`didn't find Tables I like, this house has ${confirmedTables} similar tables \nPlease check database credentials for my PERSONAL database`))
						}
						queries.selectOneQuery('schema_version', 'key', 'db_version')
							.then((version) => {
								if (version.val === 1) {
									queries.dropTableQuery('quest')
										.then(() => {
											queries.addOneQuery('schema_version', 'val', 'key', 'db_version')
												.then(() => resolve(true))
												.catch((unhappy) => {
													reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
												})
											log.info('applied Db migration 2')
										})
										.catch((unhappy) => {
											reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
										})
								}
								else if (version.val === 2) {
									queries.mysteryQuery(migration3.quest)
										.catch((unhappy) => {
											reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
										})
									queries.addOneQuery('schema_version', 'val', 'key', 'db_version')
										.then(() => resolve(true))
										.catch((unhappy) => {
											reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
										})
									log.info('applied Db migration 3')
									resolve(true)
								}
								else if (version.val === 3) {
									Promise.all([
										queries.mysteryQuery(migration4.id.monsters),
										queries.mysteryQuery(migration4.id.egg),
										queries.mysteryQuery(migration4.id.raid),
										queries.mysteryQuery(migration4.id.quest),
										queries.mysteryQuery(migration4.monsters),
										queries.mysteryQuery(migration4.raid),
										queries.dropTableQuery('activeRaid'),
										queries.dropTableQuery('comevent'),
										queries.dropTableQuery('comsubmission'),
										queries.dropTableQuery('pokemon'),
										queries.dropTableQuery('pokestop'),
									])
										.then(() => {
											queries.addOneQuery('schema_version', 'val', 'key', 'db_version')
												.then(() => resolve(true))
												.catch((unhappy) => {
													reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
												})
											log.info('applied Db migration 4')
										})
										.catch((unhappy) => {
											reject(log.error(`Database migration unhappy to create migration 4: ${unhappy.message}`))
										})
								}
								else if (version.val === 4) {
									log.info('Database schema-version 4 confirmed')
									resolve(true)
								}

							})
							.catch((unhappy) => {
								reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
							})
					})
					.catch((unhappy) => {
						reject(log.error(`Database migration unhappy to create tables: ${unhappy.message}`))
					})
			}
		})
		.catch((unhappy) => {
			reject(log.error(`Database migration unhappy: ${unhappy.message}`))
		})
})
