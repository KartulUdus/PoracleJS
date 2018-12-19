const log = require('../logger')
const cp = require('child_process')
const _ = require('lodash')
const config = require('config')
const Controller = require('./controller')

class RawData extends Controller{

/*
* monsterWhoCares, takes data object
*/
	async fetchgyms(data) {
		return new Promise(resolve => {
			let query = ``
			this.db.query()
		})
	}

}

module.exports = Quest