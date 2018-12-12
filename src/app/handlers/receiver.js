'use strict'
const log = require('../logger')
const _ = require('lodash')
const mysql = require('mysql2')
const config = require('config')
const db = mysql.createPool(config.db)




module.exports =  async (req, reply) => {
	let type =  req.body[1].type? || :req.body.type
	switch(type ){
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
	reply.send({webserver: 'happy'})
	log.info(req.body)
}
