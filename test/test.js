const config = require('config')
const mysql = require('promise-mysql2')
const Controller = require('../src/app/controllers/controller')
const db = mysql.createPool(config.db, {multipleStatements: true})
const query = new Controller(db)
const Discordjs = require('discord.js')
const client = new Discordjs.Client()
let token = config.discord.token[0]
const log = require("../src/app/logger")
const fastify = require('fastify')()
let chai = require('chai')


describe('Functional', function() {

    it('Configs should exist and JSON happy', function(done) {
        chai.assert.isObject(require('../config/dts.json'),'dts config is there')
        chai.assert.isObject(require('../config/default.json'),'dts config is there')
        done()
    })

    it('Database connection should be happy to have 9 tables', function(done) {
        query.checkSchema().then((count) => {
		    chai.assert.equal(count, 9)
            done()
		}).catch((err) => {
			done(err)
        })
    })

	it('Discord token & owner should be happy', function(done) {
		this.timeout(5000)
		client.login(token)
		client.on('ready', () => {
			let user = client.users.get(config.discord.admins[0])
			user.send('This Is A Test Message').then(done()).catch((error) => {done(error)})
		})
	})

    it('Google key should be happy', function(done) {
        query.geolocate('Tallinn Estonia').then((location) => {
			done()
        }).catch((err) => {
            done(err)
        })
    })

    it('Fastify should be happy', function(done) {

        fastify.listen(config.general.port, config.general.host, function (err) {
            if (err) done(err)
            else done()
        })
    })

})
