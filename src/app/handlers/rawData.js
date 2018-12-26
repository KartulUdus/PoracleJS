const log = require('../logger')
const _ = require('lodash')
const config = require('config')
const mysql = require('promise-mysql2')
const db = mysql.createPool(config.db)
const RawDataController = require('../controllers/rawData')
const rawDataController = new RawDataController(db)


module.exports =  async (req, reply) => {

	console.log(req.params, req.query)

	Promise.all([
		rawDataController.getLiveMonsters(req.params.lat1,req.params.lat2,req.params.lon1,req.params.lon2),
		rawDataController.getLiveRaids(req.params.lat1,req.params.lat2,req.params.lon1,req.params.lon2),
		rawDataController.getLiveEggs(req.params.lat1,req.params.lat2,req.params.lon1,req.params.lon2),
		rawDataController.getGyms(req.params.lat1,req.params.lat2,req.params.lon1,req.params.lon2),
		rawDataController.checkSprites(req.params.lat1,req.params.lat2,req.params.lon1,req.params.lon2)
	]).then((data) => {
		reply.send({
			pokemon: data[0],
			raids: data[1],
			eggs: data[2],
			gyms: data[3]
		})
	}).catch((err) => {log.error(`getLiveEggs errored with: ${err}`)})

}