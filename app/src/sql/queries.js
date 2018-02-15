const log = require("../logger");
const mysql = require('mysql2');
const config = require('config');
const pool = mysql.createPool(config.db);

module.exports = {


    updateLocation: function (table, lat, lon, col, value) {

        pool.query('UPDATE ?? set latitude = ?, longitude = ? where ?? = ?', [table, lat, lon, col, value], function (err, result) {
            if (err) log.error(err);
            log.debug(`updated location for ${table}`);
        });
    },

    selectOneQuery: function (where, column, value, callback) {

        pool.query('SELECT *  FROM ?? WHERE ?? = ?', [where, column, value], function (err, result) {
            if (err) log.error(err);
            callback(null, result[0]);
        });
    },

    countQuery: function (what, from, where, value, callback) {

        pool.query('SELECT count(??) as d FROM ?? WHERE ?? = ?', [what, from, where, value], function (err, result) {
            if (err) log.error(err);
            callback(err, result[0].d);
        });
    },
    insertQuery: function (table, columns, values) {
        pool.query(`INSERT INTO ?? (${columns.join(',')}) VALUES (?)`, [table, values], function (err, result) {
            if (err) log.error(err);
            log.debug(`Inserted to ${table}`);
        });
    },
    insertOrUpdateQuery: function (table, columns, values) {
        const cols = columns.join(', ');
        const placeholders = values.join(', ');
        const duplicate = columns.map(x => '`' + x + '`=VALUES(`' + x + '`)').join(', ');
        const query = `INSERT INTO ${table} (${cols})
                      VALUES (${placeholders})
                      ON DUPLICATE KEY UPDATE ${duplicate}`;
        pool.query(query, function (err, result) {
            if (err) log.error(err);
            log.debug(`Inserted or maybe updated ${table}`);
        });
    },

    updateQuery: function (table, field, newvalue ,col, value ) {
        pool.query(`UPDATE ?? SET ?? = ? where ?? = ?`, [table, field, newvalue ,col, value], function (err, result) {
            if (err) log.error(err);
            log.debug(`updated ${field} in ${table}`);
        });
    },

    mysteryQuery: function (query, callback) {
        pool.query(query, function (err, result) {
            if (err) log.error(err);
            log.debug(`Mystery query executed`);
            callback(null, result);
        });
    },

    deleteQuery: function (table, column, value) {

        pool.query('DELETE FROM ?? WHERE ?? = ?', [table, column, value], function (err, result) {
            if (err) log.error(err);
            log.debug(`Deleted ${result.affectedRows} from ${table}`);
        });
    },
    deleteMonsterQuery: function (table, column, value, id) {
        pool.query('DELETE FROM ?? WHERE ?? = ? and id = ?', [table, column, value, id], function (err, result) {
            if (err) log.error(err);
            log.debug(`Deleted ${result.affectedRows} from ${table}`);
        });
    },
    selectAllQuery: function (table, column, value, callback) {
        pool.query('SELECT * FROM ?? WHERE ?? = ?', [table, column, value], function (err, result) {
            if (err) log.error(err);
            callback(null, result);
        });
    },
    addOneQuery: function (table, addable, column, value) {
        pool.query('update ?? set ?? = ??+1 where ?? = ?', [table, addable, addable, column, value], function (err, result) {
            if (err) log.error(err);
            log.debug(`Added one to ${table}.${addable}`);
        });
    },
    monsterWhoCares: function (data, callback) {
        let areastring = '';
        data.matched.forEach(function(area) {
            areastring = areastring.concat(`or humans.area like '%${area}%' `)
        });
        let query =
            `select * from monsters 
            join humans on humans.id = monsters.id
            where humans.enabled = 1 and
            pokemon_id=${data.pokemon_id} and 
            min_iv<=${data.iv} and
            max_iv>=${data.iv} and
            min_cp<=${data.cp} and
            max_cp>=${data.cp} and
            min_level<=${data.pokemon_level} and
            max_level>=${data.pokemon_level} and
            atk<=${data.individual_attack} and
            def<=${data.individual_defense} and
            sta<=${data.individual_stamina} and
            min_weight<=${data.weight} * 1000 and
            max_weight>=${data.weight} * 1000 and
            		       round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) )<monsters.distance ${areastring})`;
        log.debug(query);

        pool.query(query, function (err, result) {
            if (err) log.error(err);
            callback(result);
            log.info(`${data.name} appeared and ${result.length} humans cared`)
        });
    },
    raidWhoCares: function (data, callback) {
        let areastring = '';
        data.matched.forEach(function(area) {
            areastring = areastring.concat(`or humans.area like '%${area}%' `)
        });
        let query =
            `select * from raid 
            join humans on humans.id = raid.id
            where humans.enabled = 1 and
            pokemon_id=${data.pokemon_id} and 
            (raid.team = ${data.team_id} or raid.team = 4) and 
            		       round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) )<raid.distance ${areastring})`;
        log.debug(query);
        pool.query(query, function (err, result) {
            if (err) log.error(err);
            callback(result);
            log.info(`Raid against ${data.name} appeared and ${result.length} humans cared`)
        });
    },
    eggWhoCares: function (data, callback) {
        let areastring = '';
        data.matched.forEach(function(area) {
            areastring = areastring.concat(`or humans.area like '%${area}%' `)
        });
        let query =
            `select * from egg 
            join humans on humans.id = egg.id
            where humans.enabled = 1 and 
            raid_level=${data.level} and 
            (egg.team = ${data.team_id} or egg.team = 4) and 
            		       round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) )<egg.distance ${areastring})`;
        log.debug(query);
        pool.query(query, function (err, result) {
            if (err) log.error(err);
            callback(result);
            log.info(`Raid level ${data.level} appeared and ${result.length} humans cared`)
        });
    }
};

