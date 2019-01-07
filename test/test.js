const config = require('config')
const mysql = require('promise-mysql2')
const MonsterController = require('../src/app/controllers/controller')
const RaidController = require('../src/app/controllers/raid')
const QuestController = require('../src/app/controllers/quest')
const db = mysql.createPool(config.db, {multipleStatements: true})

const monsterController = new MonsterController(db)
const raidController = new RaidController(db)
const questController = new QuestController(db)


const fs = require('fs')
const path = require('path')
const fastify = require('fastify')()
let chai = require('chai')


describe('Functional', function() {

    it('Database connection should be happy to have 9 tables', function(done) {
        monsterController.checkSchema().then((count) => {
		    chai.assert.equal(count, 9)
            done()
		}).catch((err) => {
			done(err)
        })
    })

    it('Should be able to geolocate stuff', function(done) {
        monsterController.geolocate('Tallinn Estonia').then((location) => {
			done()
        }).catch((err) => {
            done(err)
        })
    })

	it('Should be able to reverse - geolocate stuff', function(done) {
		monsterController.getAddress({lat: 59.4372155, lon: 24.7453688}).then((location) => {
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('The geolocated stuff should be cached', function(done) {
		if (fs.existsSync(path.join(__dirname, '../.cache/cache/addrCache/59.4372155-24.7453688.json'))) done()
		done(err)
	})

    it('Fastify should be happy', function(done) {

        fastify.listen(config.general.port, config.general.host, function (err) {
            if (err) done(err)
            else done()
        })
    })

})

