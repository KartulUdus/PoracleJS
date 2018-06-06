const log = require('../logger');
const mysql = require('mysql2');
const config = require('config');

const pool = mysql.createPool(config.db);

function updateLocation(table, lat, lon, col, value) {

	pool.query('UPDATE ?? set latitude = ?, longitude = ? where ?? = ?', [table, lat, lon, col, value], (err, result) => {
		if (err) log.error(err);
		log.debug(`updated location for ${table}`);
	});
}

function selectOneQuery(where, column, value, callback) {

	pool.query('SELECT * FROM ?? WHERE ?? = ?', [where, column, value], (err, result) => {
		if (err) log.error(err);
		callback(err, result[0]);
	});
}

function countQuery(what, from, where, value, callback) {

	pool.query('SELECT count(??) as d FROM ?? WHERE ?? = ?', [what, from, where, value], (err, result) => {
		if (err) log.error(err);
		callback(err, result[0].d);
	});
}
function insertQuery(table, columns, values) {
	pool.query(`INSERT INTO ?? (${columns.join(',')}) VALUES (?)`, [table, values], (err, result) => {
		if (err) log.error(err);
		log.debug(`Inserted to ${table}`);
	});
}
function insertOrUpdateQuery(table, columns, values) {
	const cols = columns.join(', ');
	const placeholders = values.join(', ');
	const duplicate = columns.map(x => `\`${x}\`=VALUES(\`${x}\`)`).join(', ');
	const query = `INSERT INTO ${table} (${cols})
                      VALUES (${placeholders})
                      ON DUPLICATE KEY UPDATE ${duplicate}`;
	pool.query(query, (err, result) => {
		if (err) log.error(err);
		log.debug(`Inserted or maybe updated ${table}`);
	});
}

function updateQuery(table, field, newvalue, col, value) {
	pool.query('UPDATE ?? SET ?? = ? where ?? = ?', [table, field, newvalue, col, value], (err, result) => {
		if (err) log.error(err);
		log.debug(`updated ${field} in ${table}`);
	});
}

function mysteryQuery(query, callback) {
	pool.query(query, (err, result) => {
		if (err) log.error(err);
		log.debug('Mystery query executed');
		callback(err, result);
	});
}

function deleteQuery(table, column, value) {

	pool.query('DELETE FROM ?? WHERE ?? = ?', [table, column, value], (err, result) => {
		if (err) log.error(err);
		log.debug(`Deleted ${result.affectedRows} from ${table}`);
	});
}
function deleteMonsterQuery(table, column, value, id) {
	pool.query('DELETE FROM ?? WHERE ?? = ? and id = ?', [table, column, value, id], (err, result) => {
		if (err) log.error(err);
		log.debug(`Deleted ${result.affectedRows} from ${table}`);
	});
}
function selectAllQuery(table, column, value, callback) {
	pool.query('SELECT * FROM ?? WHERE ?? = ?', [table, column, value], (err, result) => {
		if (err) log.error(err);
		callback(null, result);
	});
}
function addOneQuery(table, addable, column, value) {
	pool.query('update ?? set ?? = ??+1 where ?? = ?', [table, addable, addable, column, value], (err, result) => {
		if (err) log.error(err);
		log.debug(`Added one to ${table}.${addable}`);
	});
}
function monsterWhoCares(data, callback) {
	let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
	data.matched.forEach((area) => {
		areastring = areastring.concat(`or humans.area like '%${area}%' `);
	});
	const query =
            `select * from monsters 
            join humans on humans.id = monsters.id
            where humans.enabled = 1 and
            pokemon_id=${data.pokemon_id} and 
            min_iv<=${data.iv} and
            max_iv>=${data.iv} and
            min_cp<=${data.cp} and
            max_cp>=${data.cp} and
            (form = ${data.form} or form = 0) and
            min_level<=${data.pokemon_level} and
            max_level>=${data.pokemon_level} and
            atk<=${data.individual_attack} and
            def<=${data.individual_defense} and
            sta<=${data.individual_stamina} and
            min_weight<=${data.weight} * 1000 and
            max_weight>=${data.weight} * 1000 and
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < monsters.distance and monsters.distance != 0) or
               monsters.distance = 0 and (${areastring}))
               group by humans.id`;
	log.debug(query);

	pool.query(query, (err, result) => {
		if (err) {
			log.error(err);
			return callback(err);
		}
		log.info(`${data.name} appeared and ${result.length} humans cared`);
		return callback(result);
	});
}
function raidWhoCares(data, callback) {
	let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
	data.matched.forEach((area) => {
		areastring = areastring.concat(`or humans.area like '%${area}%' `);
	});
	const query =
            `select * from raid 
            join humans on humans.id = raid.id
            where humans.enabled = 1 and
            (pokemon_id=${data.pokemon_id} or (pokemon_id=721 and raid.level=${data.level})) and 
            (raid.team = ${data.team_id} or raid.team = 4) and 
            (raid.park = ${data.park} or raid.park = 0) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < raid.distance and raid.distance != 0) or
               raid.distance = 0 and (${areastring}))
               group by humans.id`;
	log.debug(query);
	pool.query(query, (err, result) => {
		if (err) {
			log.error(err);
			return callback(err);
		}
		log.info(`Raid against ${data.name} appeared and ${result.length} humans cared`);
		return callback(result);
	});
}
function eggWhoCares(data, callback) {
	let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
	data.matched.forEach((area) => {
		areastring = areastring.concat(`or humans.area like '%${area}%' `);
	});
	const query =
            `select * from egg 
            join humans on humans.id = egg.id
            where humans.enabled = 1 and 
            (egg.park = ${data.park} or egg.park = 0) and
            raid_level = ${data.level} and 
            (egg.team = ${data.team_id} or egg.team = 4) and 
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < egg.distance and egg.distance != 0) or
               egg.distance = 0 and (${areastring}))`;
	log.debug(query);
	pool.query(query, (err, result) => {
		if (err) {
			log.error(err);
			return callback(err);
		}
		log.info(`Raid level ${data.level} appeared and ${result.length} humans cared`);
		return callback(result);
	});
}

function questWhoCares(data, callback) {
	let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
	data.matched.forEach((area) => {
		areastring = areastring.concat(`or humans.area like '%${area}%' `);
	});
	const query =
            `select * from quest
            join humans on humans.id = quest.id
            where humans.enabled = 1 and
            (quest_id = ${data.quest_id} or reward_id = ${data.quest_id}) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) )
              * cos( radians( humans.latitude ) )
              * cos( radians( humans.longitude ) - radians(${data.longitude}) )
              + sin( radians(${data.latitude}) )
              * sin( radians( humans.latitude ) ) ) < quest.distance and egg.distance != 0) or
               egg.distance = 0 and (${areastring}))`;
	log.debug(query);
	pool.query(query, (err, result) => {
		if (err) {
			log.error(err);
			return callback(err);
		}
		log.info(`Quest id ${data.quest.id} for reward ${data.reward_id} was reported and ${result.length} humans cared`);
		return callback(result);
	});
}

module.exports = {
	eggWhoCares,
	raidWhoCares,
	monsterWhoCares,
	questWhoCares,
	insertOrUpdateQuery,
	insertQuery,
	updateLocation,
	updateQuery,
	selectOneQuery,
	selectAllQuery,
	countQuery,
	deleteQuery,
	deleteMonsterQuery,
	addOneQuery,
	mysteryQuery,
};

