const config = require('config')
const mysql = require('promise-mysql2')
const MonsterController = require('../src/app/controllers/monster')
const RaidController = require('../src/app/controllers/raid')
const QuestController = require('../src/app/controllers/quest')
const db = mysql.createPool(config.db, {multipleStatements: true})

const monsterController = new MonsterController(db)
const raidController = new RaidController(db)
const questController = new QuestController(db)

const testData = require('./monsterTest')
const mustache = require('mustache')
const _ = require('lodash')


const fs = require('fs')
const path = require('path')
const fastify = require('fastify')()
let chai = require('chai')



let pokemon = Math.floor(Math.random() * 500)
let randomId =  Math.floor(Math.random() * 50000000000)
let randomLat = (Math.random() * (59.46813 - 59.39226) + 59.39226).toFixed(6)
let randomLon = (Math.random() * (24.861638 - 24.543385) + 24.543385).toFixed(6)
let timeIn20Min = Math.trunc((new Date().valueOf() / 1000) + Math.floor(Math.random() * 1200))
let randomIV = Math.floor(Math.random() * 15)
let randomTeam =  Math.floor(Math.random() * 3)
let randomMove =  Math.floor(Math.random() * 291)


const view = {
	randomId: randomId,
	pokemon: pokemon,
	randomLat: randomLat,
	randomLon: randomLon,
	timeIn20Min: timeIn20Min,
	randomIV: randomIV,
	randomMove: randomMove
}



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

    it('Fastify should be able to host on configured host and port', function(done) {

        fastify.listen(3031, config.general.host, function (err) {
            if (err) done(err)
            else done()
        })
    })

})


describe('Pokemon Filters', function() {


	it('should process a bulbasaur with iv filter', function(done) {
		let template = JSON.stringify(_.clone(testData.monsterstatic))
		let message = mustache.render(template, view)
		message = JSON.parse(message)
		monsterController.handle(message).then((potato) => {
			console.log(potato[0].message)
			chai.assert.equal(potato[0].emoji[0], '⚡')
			chai.assert.equal(potato[0].message.embed.color, 10329501)
			chai.assert.equal(potato[0].message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_025_00.png`.toLowerCase())
			done()
		}).catch((err) => {
			done(err)
		})

	})

})