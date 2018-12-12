const mysql = require('mysql2');
const config = require('config');

const pool = mysql.createPool(config.db);

function getSqlConnection() {
	return pool.getConnection().disposer((connection) => {
		pool.releaseConnection(connection);
	});
}

module.exports = getSqlConnection;