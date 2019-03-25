const { mount } = require('telegraf')
const config = require('config')
const mysql = require('mysql2/promise')

const db = mysql.createPool(config.db)
const Controller = require('../../../controllers/controller')

const query = new Controller(db)
const dts = require('../../../../config/dts')
const log = require('../../../logger')


/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = () => mount('text', (ctx, next) => {
	ctx.state.controller = {
		query,
		dts,
		log,
		config,
	}
	return next()
})