var mysql = require('promise-mysql');
var config = require('config');

pool = mysql.createPool(config.db);

function getSqlConnection() {
    return pool.getConnection().disposer(function(connection) {
        pool.releaseConnection(connection);
    });
}

module.exports = getSqlConnection;