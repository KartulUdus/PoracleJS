const log = require('../logger')
const _ = require('lodash')
const config = require('config')
const mysql = require('promise-mysql2')
const db = mysql.createPool(config.db)
const RawDataController = require('../controllers/rawData')
const rawDataController = new RawDataController(db)


module.exports =  async (req, reply) => {

	console.log(req.query.lat, req.query)
	reply.send({
		gyms: 'gyms',
		raids: 'sagl',
		pokestop: 'agasf',
		pokemon: 'asfg'
		})
}