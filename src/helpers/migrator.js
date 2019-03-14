const Controller = require('../controllers/controller')
const config = require('config')
const mysql = require('mysql2/promise')

const db = mysql.createPool(config.db, { multipleStatements: true })
const queries = new Controller(db)
const log = require('../logger')

const pokestop = `CREATE TABLE \`pokestop\` (
  \`id\` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  \`name\` varchar(191) COLLATE utf8_unicode_ci NOT NULL,
  \`url\` varchar(191) COLLATE utf8_unicode_ci DEFAULT NULL,
  \`lured\` TIMESTAMP NULL DEFAULT NULL,
  \`latitude\` double NOT NULL,
  \`longitude\` double NOT NULL,
  KEY \`pokemstop_id\` (\`id\`),
  KEY \`pokestop_latitude_longitude\` (\`latitude\`,\`longitude\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const activeRaid = `CREATE TABLE \`activeRaid\` (
  \`id\` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  \`gym_id\` varchar(50) NOT NULL DEFAULT 0,
  \`gym_name\` longtext COLLATE utf8_unicode_ci,
  \`start\` TIMESTAMP NULL DEFAULT NULL,
  \`end\` TIMESTAMP NULL DEFAULT NULL,
  \`move_1\` smallint(6) NOT NULL DEFAULT 0,
  \`move_2\` smallint(6) NOT NULL DEFAULT 0,
  \`sponsor_id\` varchar(50) NOT NULL DEFAULT 0,
  \`is_exclusive\` tinyint(1) NOT NULL DEFAULT 0,
  \`team\` smallint(1) DEFAULT 4,
  \`latitude\` double NOT NULL,
  \`longitude\` double NOT NULL,
  KEY \`geocoded_id\` (\`id\`),
  KEY \`geocoded_latitude_longitude\` (\`latitude\`,\`longitude\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const pokemon = `CREATE TABLE \`pokemon\` (
  \`encounter_id\` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  \`pokemon_id\` smallint(6) NOT NULL,
  \`atk\` smallint(2) NOT NULL DEFAULT 0,
  \`def\` smallint(2) NOT NULL DEFAULT 0,
  \`sta\` smallint(2) NOT NULL DEFAULT 0,
  \`level\` smallint(2) NOT NULL DEFAULT 0,
  \`gender\` smallint(2) NOT NULL DEFAULT 0,
  \`form\` smallint(6) NOT NULL DEFAULT 0,
  \`weight\` double NOT NULL DEFAULT 0,
  \`weather\` smallint(6) NOT NULL DEFAULT 0,
  \`cp\` smallint(6) NOT NULL DEFAULT 0,
  \`move_1\` smallint(6) NOT NULL DEFAULT 0,
  \`move_2\` smallint(6) NOT NULL DEFAULT 0,
  \`latitude\` double NOT NULL,
  \`longitude\` double NOT NULL,
  \`disappear_time\` TIMESTAMP NULL DEFAULT NULL,
  \`created_timestamp\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`encounter_id\`),
  KEY \`geocoded_id\` (\`encounter_id\`),
  KEY \`geocoded_latitude_longitude\` (\`latitude\`,\`longitude\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

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

const comevent = `
CREATE TABLE \`comevent\` (
  \`creator_id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`creator_name\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`channel_id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`end_timestamp\` TIMESTAMP NULL DEFAULT NULL,
  \`create_timestamp\` TIMESTAMP NULL DEFAULT NULL,
  \`monster_id\` longtext COLLATE utf8_unicode_ci,
  \`finished\` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const comentry = `
CREATE TABLE \`comsubmission\` (
  \`discord_id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  \`discord_name\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  \`submit_timestamp\` TIMESTAMP NULL DEFAULT NULL,
  \`monster_id\` int(11) DEFAULT NULL,
  \`seen\` int(11) DEFAULT NULL,
  \`caught\` int(11) DEFAULT NULL,
  \`lucky\` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`

const migration3 = {
	quest: `
		ALTER TABLE \`quest\` 
		ADD \`shiny\` smallint(1) NOT NULL DEFAULT 0;
	`,
}


module.exports = async () => {
	queries.countQuery('TABLE_NAME', 'information_schema.tables', 'table_schema', config.db.database).then((tables) => {
		if (!tables) {
			Promise.all([
				queries.mysteryQuery(humans),
				queries.mysteryQuery(gymInfo),
				queries.mysteryQuery(monsters),
				queries.mysteryQuery(raid),
				queries.mysteryQuery(quest),
				queries.mysteryQuery(comevent),
				queries.mysteryQuery(comentry),
				queries.mysteryQuery(egg),
				queries.mysteryQuery(pokemon),
				queries.mysteryQuery(pokestop),
				queries.mysteryQuery(activeRaid),
				queries.mysteryQuery(schemaVersion),
			]).then(() => {
				queries.insertQuery('schema_version', ['`key`', '`val`'], ['db_version', '3'])
				log.info('Database tables created, db_version 3 applied')
			})
		}
		else {
			queries.checkSchema().then((confirmedTables) => {
				if (confirmedTables === 9) {
					log.info('Database tables confirmed')
				}
				else {
					log.error(`didn't find Tables I like, this house has ${confirmedTables} similar tables \nPlease check database credentials for my PERSONAL database`)
					process.exit()
				}
				queries.selectOneQuery('schema_version', 'key', 'db_version').then((version) => {
					if (version.val === 1) {
						queries.dropTableQuery('quest').then((deleted) => {
							queries.mysteryQuery(quest).then()
							queries.addOneQuery('schema_version', 'val', 'key', 'db_version')
							log.info('applied Db migration 2')
						})
					}
					else if (version.val === 2) {
						queries.mysteryQuery(migration3.quest)
						queries.addOneQuery('schema_version', 'val', 'key', 'db_version')
						log.info('applied Db migration 3')
					}
				})
			})
		}
	})
		.catch((unhappy) => {
			log.error(`Database migration unhappy: ${unhappy.message}`)
			process.exit()
		})
}
