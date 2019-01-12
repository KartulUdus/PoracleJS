/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

# Create Testuser
# ------------------------------------------------------------

CREATE USER 'dev'@'localhost' IDENTIFIED BY 'dev';
GRANT SELECT,INSERT,UPDATE,DELETE,CREATE,DROP ON *.* TO 'dev'@'localhost';


# Create DB
# ------------------------------------------------------------

CREATE DATABASE IF NOT EXISTS `poracle` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci;
USE `poracle`;


# Dump of table activeQuest
# ------------------------------------------------------------

DROP TABLE IF EXISTS `activeQuest`;

CREATE TABLE `activeQuest` (
  `pokestop_id` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '0',
  `pokestop_name` longtext COLLATE utf8_unicode_ci DEFAULT NULL,
  `type` smallint(1) NOT NULL DEFAULT 0,
  `target` smallint(6) NOT NULL DEFAULT 0,
  `rewards` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `conditions` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `pokestop_url` varchar(191) COLLATE utf8_unicode_ci DEFAULT NULL,
  `created_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `end_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  PRIMARY KEY (`pokestop_id`,`latitude`,`longitude`),
  KEY `geocoded_latitude_longitude` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table activeRaid
# ------------------------------------------------------------

DROP TABLE IF EXISTS `activeRaid`;

CREATE TABLE `activeRaid` (
  `id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `gym_id` varchar(50) COLLATE utf8_unicode_ci NOT NULL DEFAULT '0',
  `gym_name` longtext COLLATE utf8_unicode_ci DEFAULT NULL,
  `start` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `end` timestamp NULL DEFAULT NULL,
  `move_1` smallint(6) NOT NULL DEFAULT 0,
  `move_2` smallint(6) NOT NULL DEFAULT 0,
  `is_exclusive` tinyint(1) NOT NULL DEFAULT 0,
  `team` smallint(1) DEFAULT 4,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `cp` smallint(6) NOT NULL DEFAULT 0,
  `created_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  `raid_level` smallint(6) NOT NULL DEFAULT 0,
  `pokemon_id` smallint(6) NOT NULL DEFAULT 0,
  PRIMARY KEY (`pokemon_id`,`gym_id`,`start`),
  KEY `geocoded_id` (`id`),
  KEY `geocoded_latitude_longitude` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table comevent
# ------------------------------------------------------------

DROP TABLE IF EXISTS `comevent`;

CREATE TABLE `comevent` (
  `creator_id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `creator_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `channel_id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `end_timestamp` timestamp NULL DEFAULT NULL,
  `create_timestamp` timestamp NULL DEFAULT NULL,
  `monster_id` longtext COLLATE utf8_unicode_ci DEFAULT NULL,
  `finished` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table comsubmission
# ------------------------------------------------------------

DROP TABLE IF EXISTS `comsubmission`;

CREATE TABLE `comsubmission` (
  `discord_id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `discord_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submit_timestamp` timestamp NULL DEFAULT NULL,
  `monster_id` int(11) DEFAULT NULL,
  `seen` int(11) DEFAULT NULL,
  `caught` int(11) DEFAULT NULL,
  `lucky` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table egg
# ------------------------------------------------------------

DROP TABLE IF EXISTS `egg`;

CREATE TABLE `egg` (
  `id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `raid_level` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `park` tinyint(1) NOT NULL,
  `template` smallint(5) DEFAULT 3,
  `distance` int(11) NOT NULL,
  `team` smallint(1) DEFAULT 4,
  PRIMARY KEY (`id`,`raid_level`),
  KEY `raid_level` (`raid_level`),
  KEY `raid_distance` (`distance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOCK TABLES `egg` WRITE;
/*!40000 ALTER TABLE `egg` DISABLE KEYS */;

INSERT INTO `egg` (`id`, `raid_level`, `park`, `template`, `distance`, `team`)
VALUES
	('414388133329764352','1',1,3,0,4),
	('414388133329764352','2',0,3,0,4),
	('414388133329764352','4',0,3,0,3),
	('414388133329764352','5',0,3,2000,4);

/*!40000 ALTER TABLE `egg` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table gym-info
# ------------------------------------------------------------

DROP TABLE IF EXISTS `gym-info`;

CREATE TABLE `gym-info` (
  `id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `park` tinyint(1) NOT NULL DEFAULT 0,
  `gym_name` longtext COLLATE utf8_unicode_ci DEFAULT NULL,
  `url` varchar(191) COLLATE utf8_unicode_ci DEFAULT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `team` smallint(1) DEFAULT 4,
  PRIMARY KEY (`id`),
  KEY `geocoded_park` (`park`),
  KEY `geocoded_latitude_longitude` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table humans
# ------------------------------------------------------------

DROP TABLE IF EXISTS `humans`;

CREATE TABLE `humans` (
  `id` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `alerts_sent` int(11) NOT NULL DEFAULT 0,
  `enabled` tinyint(1) NOT NULL DEFAULT 1,
  `area` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `latitude` double DEFAULT 0,
  `longitude` double DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `humans_name` (`name`),
  KEY `humans_alerts_sent` (`alerts_sent`),
  KEY `humans_latitude_longitude` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `humans` WRITE;
/*!40000 ALTER TABLE `humans` DISABLE KEYS */;

INSERT INTO `humans` (`id`, `name`, `alerts_sent`, `enabled`, `area`, `latitude`, `longitude`)
VALUES
	('414388133329764352','travis-test',4,1,'[\"tallinn\"]',58.3801207,26.72245);

/*!40000 ALTER TABLE `humans` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table monsters
# ------------------------------------------------------------

DROP TABLE IF EXISTS `monsters`;

CREATE TABLE `monsters` (
  `id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pokemon_id` smallint(6) NOT NULL,
  `distance` int(11) NOT NULL,
  `min_iv` smallint(3) NOT NULL,
  `max_iv` smallint(3) NOT NULL,
  `min_cp` smallint(6) NOT NULL,
  `max_cp` smallint(6) NOT NULL,
  `min_level` smallint(2) NOT NULL,
  `max_level` smallint(2) NOT NULL,
  `atk` smallint(2) NOT NULL,
  `def` smallint(2) NOT NULL,
  `sta` smallint(2) NOT NULL,
  `template` smallint(5) DEFAULT 3,
  `min_weight` double NOT NULL,
  `max_weight` double NOT NULL,
  `form` smallint(3) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`pokemon_id`,`min_iv`,`max_iv`,`min_cp`,`max_cp`,`min_level`,`max_level`,`atk`,`def`,`sta`,`min_weight`,`max_weight`,`form`),
  KEY `monsters_pokemon_id` (`pokemon_id`),
  KEY `monsters_distance` (`distance`),
  KEY `monsters_min_iv` (`min_iv`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOCK TABLES `monsters` WRITE;
/*!40000 ALTER TABLE `monsters` DISABLE KEYS */;

INSERT INTO `monsters` (`id`, `pokemon_id`, `distance`, `min_iv`, `max_iv`, `min_cp`, `max_cp`, `min_level`, `max_level`, `atk`, `def`, `sta`, `template`, `min_weight`, `max_weight`, `form`)
VALUES
	('414388133329764352',1,0,100,100,0,9000,0,40,0,0,0,3,0,9000000,0),
	('414388133329764352',2,0,0,0,0,9000,0,40,0,0,0,3,0,9000000,0),
	('414388133329764352',3,0,-1,100,2000,9000,0,40,0,0,0,3,0,9000000,0),
	('414388133329764352',4,0,-1,100,0,2000,0,40,0,0,0,3,0,9000000,0),
	('414388133329764352',5,0,-1,100,0,9000,30,40,0,0,0,3,0,9000000,0),
	('414388133329764352',6,0,-1,100,0,9000,0,35,0,0,0,3,0,9000000,0),
	('414388133329764352',7,0,-1,100,0,9000,0,40,10,0,0,3,0,9000000,0),
	('414388133329764352',8,0,-1,100,0,9000,0,40,0,10,0,3,0,9000000,0),
	('414388133329764352',9,0,-1,100,0,9000,0,40,0,0,10,3,0,9000000,0),
	('414388133329764352',10,0,-1,100,0,9000,0,40,0,0,0,3,3000,9000000,0),
	('414388133329764352',11,0,-1,100,0,9000,0,40,0,0,0,3,0,3200,0),
	('414388133329764352',12,1000,-1,100,0,9000,0,40,0,0,0,3,0,9000000,0),
	('414388133329764352',201,0,-1,100,0,9000,0,40,0,0,0,3,0,9000000,6);

/*!40000 ALTER TABLE `monsters` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table pokemon
# ------------------------------------------------------------

DROP TABLE IF EXISTS `pokemon`;

CREATE TABLE `pokemon` (
  `encounter_id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `pokemon_id` smallint(6) NOT NULL,
  `atk` smallint(2) NOT NULL DEFAULT 0,
  `def` smallint(2) NOT NULL DEFAULT 0,
  `sta` smallint(2) NOT NULL DEFAULT 0,
  `level` smallint(2) NOT NULL DEFAULT 0,
  `gender` smallint(2) NOT NULL DEFAULT 0,
  `form` smallint(6) NOT NULL DEFAULT 0,
  `weight` double NOT NULL DEFAULT 0,
  `weather` smallint(6) NOT NULL DEFAULT 0,
  `cp` smallint(6) NOT NULL DEFAULT 0,
  `move_1` smallint(6) NOT NULL DEFAULT 0,
  `move_2` smallint(6) NOT NULL DEFAULT 0,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  `disappear_time` timestamp NULL DEFAULT NULL,
  `created_timestamp` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`encounter_id`),
  KEY `geocoded_id` (`encounter_id`),
  KEY `geocoded_latitude_longitude` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table pokestop
# ------------------------------------------------------------

DROP TABLE IF EXISTS `pokestop`;

CREATE TABLE `pokestop` (
  `id` varchar(50) COLLATE utf8_unicode_ci NOT NULL,
  `name` varchar(191) COLLATE utf8_unicode_ci NOT NULL,
  `url` varchar(191) COLLATE utf8_unicode_ci DEFAULT NULL,
  `lured` timestamp NULL DEFAULT NULL,
  `latitude` double NOT NULL,
  `longitude` double NOT NULL,
  KEY `pokemstop_id` (`id`),
  KEY `pokestop_latitude_longitude` (`latitude`,`longitude`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;



# Dump of table quest
# ------------------------------------------------------------

DROP TABLE IF EXISTS `quest`;

CREATE TABLE `quest` (
  `id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `reward` int(11) NOT NULL DEFAULT 0,
  `template` smallint(5) DEFAULT 3,
  `reward_type` int(11) NOT NULL DEFAULT 0,
  `distance` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`reward_type`,`reward`),
  KEY `distance` (`distance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOCK TABLES `quest` WRITE;
/*!40000 ALTER TABLE `quest` DISABLE KEYS */;

INSERT INTO `quest` (`id`, `reward`, `template`, `reward_type`, `distance`)
VALUES
	('414388133329764352',2,3,2,0),
	('414388133329764352',705,3,2,5000),
	('414388133329764352',500,3,3,0),
	('414388133329764352',137,3,7,0);

/*!40000 ALTER TABLE `quest` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table raid
# ------------------------------------------------------------

DROP TABLE IF EXISTS `raid`;

CREATE TABLE `raid` (
  `id` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `pokemon_id` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `park` tinyint(1) NOT NULL,
  `template` smallint(5) DEFAULT 3,
  `distance` int(11) NOT NULL,
  `team` smallint(1) DEFAULT 4,
  `level` smallint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`,`pokemon_id`,`park`,`level`),
  KEY `raid_pokemon_id` (`pokemon_id`),
  KEY `raid_distance` (`distance`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOCK TABLES `raid` WRITE;
/*!40000 ALTER TABLE `raid` DISABLE KEYS */;

INSERT INTO `raid` (`id`, `pokemon_id`, `park`, `template`, `distance`, `team`, `level`)
VALUES
	('414388133329764352','13',0,3,0,4,0),
	('414388133329764352','14',1,3,0,4,0),
	('414388133329764352','15',0,3,0,3,0),
	('414388133329764352','17',0,3,5000,4,0),
	('414388133329764352','721',0,3,0,4,3);

/*!40000 ALTER TABLE `raid` ENABLE KEYS */;
UNLOCK TABLES;


# Dump of table schema_version
# ------------------------------------------------------------

DROP TABLE IF EXISTS `schema_version`;

CREATE TABLE `schema_version` (
  `key` varchar(255) COLLATE utf8_unicode_ci NOT NULL,
  `val` smallint(6) NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

LOCK TABLES `schema_version` WRITE;
/*!40000 ALTER TABLE `schema_version` DISABLE KEYS */;

INSERT INTO `schema_version` (`key`, `val`)
VALUES
	('db_version',3);

/*!40000 ALTER TABLE `schema_version` ENABLE KEYS */;
UNLOCK TABLES;



/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
