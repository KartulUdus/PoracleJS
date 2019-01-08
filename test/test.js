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
const should = chai.should();

let pokemon = Math.floor(Math.random() * 500)
let randomId =  Math.floor(Math.random() * 50000000000)
let randomLat = (Math.random() * (59.46813 - 59.39226) + 59.39226).toFixed(6)
let randomLon = (Math.random() * (24.861638 - 24.543385) + 24.543385).toFixed(6)
let timeIn20Min = Math.trunc((new Date().valueOf() / 1000) + Math.floor(Math.random() * 1200))
let timeIn40Min = Math.trunc((new Date().valueOf() / 1000) + Math.floor(Math.random() * 2400))
let randomIV = Math.floor(Math.random() * 15)
let randomTeam =  Math.floor(Math.random() * 3)
let randomMove =  Math.floor(Math.random() * 291)


const view = {
	randomId: randomId,
	pokemon: pokemon,
	randomLat: randomLat,
	randomLon: randomLon,
	timeIn20Min: timeIn20Min,
	timeIn40Min: timeIn40Min,
	randomIV: randomIV,
	randomMove: randomMove
}



describe('Db connection, geolocating, webserver', function() {

    it('Database connection should be happy and have needed tables', function(done) {
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

        fastify.listen(config.general.port, config.general.host, function (err) {
            if (err) done(err)
            else done()
        })
    })

})

describe('Pokemon Filters', function() {

	it('should process a bulbasaur with iv filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.bublasaur))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.bublasaur2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🌿')
			chai.assert.equal(affirmative.message.embed.color, 16744448)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_001_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a ivysaur with maxiv filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.ivysaur))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.ivysaur2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🌿')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_002_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a venusaur with cp filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.venusaur))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.venusaur2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🌿')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_003_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a charmander with maxcp filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmander))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmander2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔥')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_004_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a charmeleon with min_level filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmeleon))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmeleon2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔥')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_005_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a charizard with max_level filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charizard))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charizard2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔥')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_006_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a squirtle with atk filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.squirtle))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.squirtle2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '💧')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_007_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a wartortle with def filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.wartortle))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.wartortle2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '💧')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_008_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a blastoise with sta filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.blastoise))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.blastoise2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '💧')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_009_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a caterpie with weight filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.caterpie))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.caterpie2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_010_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a metapod with maxweight filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.metapod))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.metapod2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_011_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a unown with form filter', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.unownf))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.unownd))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔮')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_201_06.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a butterfree based on distance', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.butterfree))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.butterfree2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_012_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

})

describe('Raid Filters', function() {

	it('should process a weedle raid', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.weedle))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.weedle2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 7915600)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_013_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a kakuna ex raid', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.kakuna))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.kakuna2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 7915600)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_014_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})


	it('should process a beedrill instinct raid', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.beedrill))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.beedrill2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_015_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a pidgey level 3 raid', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgey))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgey2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '⭕')
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_016_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a pidgeotto raid by distance', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgeot))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgeot2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '⭕')
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_017_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})


})

describe('Egg Filters', function() {
	it('should process level1 park egg', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level1park))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level1))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 12595240)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process level2 egg', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level2))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level3))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 12595240)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process level4 instinct', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level4instinct))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level4mystic))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process level5 dostance', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level5Tartu))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level5Tallinn))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

})

describe('Quest Filters', function() {

	it('should process porygon award', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.monsterPorygonAward))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.monsterSnorlaxAward))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_137_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process great-ball award', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemGreatBallAward))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemPokeBallAward))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}rewards/reward_2_1.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process stardust award', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.stardust600))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.stardust400))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}rewards/reward_stardust.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process awards by distance', function(done) {
		let positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemPinapBerryTartu))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		let negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemPinapBerryTallinn))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			let affirmative = work[0][0]
			let negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}rewards/reward_705_1.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

})
