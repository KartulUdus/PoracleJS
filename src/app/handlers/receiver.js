'use strict'
const log = require('../logger')
const _ = require('lodash')
const mysql = require('mysql2')
const config = require('config')
const db = mysql.createPool(config.db)
const MonsterController = require('../controllers/monster')
const monsterController = new MonsterController(db, log)



module.exports =  async (req, reply) => {
	let data = req.body
	if (!Array.isArray(data)) data = [ data ]
	switch(data[0].type ){
		case "pokemon":{
			log.info('pokemon')
			reply.send({webserver: 'happy'})
			break
		}
		case "raid":{
			log.info('raid')
			reply.send({webserver: 'happy'})
			break
		}
	}


	reply.send(
		{
		objecttype: req.body.type,
		datatype: typeof req.body,
		array: Array.isArray(req.body),
		data: data})
	log.info(req.body)
}
