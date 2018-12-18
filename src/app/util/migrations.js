module.exports = Object.freeze({

	gymInfo : `CREATE TABLE \`gym-info\` (
	  \`id\` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
	  \`park\` tinyint(1) NOT NULL DEFAULT 0,
	  \`gym_name\` longtext COLLATE utf8_unicode_ci,
	  \`description\` longtext COLLATE utf8_unicode_ci,
	  \`url\` varchar(191) COLLATE utf8_unicode_ci DEFAULT NULL,
	  \`latitude\` double NOT NULL,
	  \`longitude\` double NOT NULL,
	  KEY \`geocoded_id\` (\`id\`),
	  KEY \`geocoded_park\` (\`park\`),
	  KEY \`geocoded_latitude_longitude\` (\`latitude\`,\`longitude\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	humans : `CREATE TABLE \`humans\` (
	  \`id\` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
	  \`name\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
	  \`alerts_sent\` int(11) NOT NULL DEFAULT 0,
	  \`enabled\` tinyint(1) NOT NULL DEFAULT 1,
	  \`map_enabled\` tinyint(1) NOT NULL DEFAULT 1,
	  \`area\` TEXT NOT NULL,
	  \`latitude\` double DEFAULT 0,
	  \`longitude\` double DEFAULT 0,
	  PRIMARY KEY (\`id\`),
	  KEY \`humans_name\` (\`name\`),
	  KEY \`humans_alerts_sent\` (\`alerts_sent\`),
	  KEY \`humans_latitude_longitude\` (\`latitude\`,\`longitude\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

	monsters : `CREATE TABLE \`monsters\` (
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
	  \`min_weight\` double NOT NULL,
	  \`max_weight\` double NOT NULL,
	  \`form\` smallint(3) DEFAULT 0,
	  PRIMARY KEY monsters_tracking (\`id\`, \`pokemon_id\`, \`min_iv\`, \`max_iv\`, \`min_cp\`, \`max_cp\`, \`min_level\`, \`max_level\`, \`atk\`, \`def\`, \`sta\`, \`min_weight\`, \`max_weight\`, \`form\`),
	  KEY \`monsters_pokemon_id\` (\`pokemon_id\`),
	  KEY \`monsters_distance\` (\`distance\`),
	  KEY \`monsters_min_iv\` (\`min_iv\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	raid : `
	CREATE TABLE \`raid\` (
	  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
	  \`pokemon_id\` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
	  \`park\` tinyint(1) NOT NULL,
	  \`distance\` int(11) NOT NULL,
	  \`team\` smallint(1) DEFAULT 4,
	  \`level\` smallint(1) DEFAULT 0,
	  PRIMARY KEY raid_tracking (\`id\`, \`pokemon_id\`, \`park\`, \`level\`),
	  KEY \`raid_pokemon_id\` (\`pokemon_id\`),
	  KEY \`raid_distance\` (\`distance\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	egg : `CREATE TABLE \`egg\` (
	  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
	  \`raid_level\` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
	  \`park\` tinyint(1) NOT NULL,
	  \`distance\` int(11) NOT NULL,
	  \`team\` smallint(1) DEFAULT 4,
	  PRIMARY KEY egg_tracking (\`id\`, \`raid_level\`),
	  KEY \`raid_level\` (\`raid_level\`),
	  KEY \`raid_distance\` (\`distance\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	schemaVersion = `CREATE TABLE \`schema_version\` (
	  \`key\` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
	  \`val\` smallint(6) NOT NULL,
	  PRIMARY KEY (\`key\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	addMonsterForms : 'ALTER TABLE monsters ADD COLUMN form smallint(3) DEFAULT 0;',

	addRaidLevels : 'ALTER TABLE raid ADD COLUMN level smallint(1) DEFAULT 0;',

	monstersKey2 : 'ALTER TABLE monsters DROP PRIMARY KEY, ADD PRIMARY KEY(id, pokemon_id, min_iv, max_iv, min_cp, max_cp, min_level, max_level, atk, def, sta, min_weight, max_weight, form);',

	raidKey2 : 'ALTER TABLE raid DROP PRIMARY KEY, ADD PRIMARY KEY(id, pokemon_id, park, level);',

	quest : `
	CREATE TABLE \`quest\` (
	  \`id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
	  \`quest_id\` int(11) DEFAULT NULL,
	  \`reward_id\` int(11) DEFAULT NULL,
	  \`distance\` int(11) NOT NULL,
	  PRIMARY KEY quest_tracking (\`id\`, \`quest_id\`, \`reward_id\`),
	  KEY \`distance\` (\`distance\`)
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	comevent : `
	CREATE TABLE \`comevent\` (
	  \`creator_id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
	  \`creator_name\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
	  \`channel_id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
	  \`end_timestamp\` TIMESTAMP NULL DEFAULT NULL,
	  \`create_timestamp\` TIMESTAMP NULL DEFAULT NULL,
	  \`monster_id\` longtext COLLATE utf8_unicode_ci,
	  \`finished\` tinyint(1) NOT NULL DEFAULT 0
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`,

	comentry : `
	CREATE TABLE \`comsubmission\` (
	  \`discord_id\` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
	  \`discord_name\` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
	  \`submit_timestamp\` TIMESTAMP NULL DEFAULT NULL,
	  \`monster_id\` int(11) DEFAULT NULL,
	  \`seen\` int(11) DEFAULT NULL,
	  \`caught\` int(11) DEFAULT NULL,
	  \`lucky\` int(11) DEFAULT NULL
	) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;`
})