const config = require('config')
const mysql = require('mysql2/promise')
const MonsterController = require('../src/controllers/monster')
const RaidController = require('../src/controllers/raid')
const QuestController = require('../src/controllers/quest')

const db = mysql.createPool(config.db, { multipleStatements: true })

const monsterController = new MonsterController(db)
const raidController = new RaidController(db)
const questController = new QuestController(db)

const testData = require('./monsterTest')
const mustache = require('mustache')
const _ = require('lodash')


const fs = require('fs')
const path = require('path')
const fastify = require('fastify')()
const chai = require('chai')

const should = chai.should()

const pokemon = Math.floor(Math.random() * 500)
const randomId = Math.floor(Math.random() * 50000000000)
const randomLat = (Math.random() * (59.46813 - 59.39226) + 59.39226).toFixed(6)
const randomLon = (Math.random() * (24.861638 - 24.543385) + 24.543385).toFixed(6)
const timeNow = Math.trunc((new Date().valueOf() / 1000))

const timeIn20Min = Math.trunc((new Date().valueOf() / 1000) + Math.floor(Math.random() * 1200))
const timeIn40Min = Math.trunc((new Date().valueOf() / 1000) + Math.floor(Math.random() * 2400))
const randomIV = Math.floor(Math.random() * 15)
const randomTeam = Math.floor(Math.random() * 3)
const randomMove = Math.floor(Math.random() * 291)


const view = {
	randomId: randomId,
	pokemon: pokemon,
	randomLat: randomLat,
	randomLon: randomLon,
	timeIn20Min: timeIn20Min,
	timeIn40Min: timeIn40Min,
	randomIV: randomIV,
	randomMove: randomMove,
	timeNow: timeNow
}


describe('Db connection, geolocating, webserver', () => {

	it('Database connection should be happy and have needed tables', (done) => {
		monsterController.checkSchema().then((count) => {
		    chai.assert.equal(count, 7)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('Should be able to geolocate stuff', (done) => {
		monsterController.geolocate('Tallinn Estonia').then((location) => {
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('Should be able to reverse - geolocate stuff', (done) => {
		monsterController.getAddress({ lat: 59.4372155, lon: 24.7453688 }).then((location) => {
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('The geolocated stuff should be cached', (done) => {
		if (fs.existsSync(path.join(__dirname, '../.cache/cache/addrCache/59.4372155-24.7453688.json'))) done()
		done(err)
	})

	it('Fastify should be able to host on configured host and port', (done) => {

		fastify.listen(config.general.port, config.general.host, (err) => {
			if (err) done(err)
			else done()
		})
	})

})

describe('Pokemon Filters', () => {

	it('should process a bulbasaur with iv filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.bublasaur))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.bublasaur2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🌿')
			chai.assert.equal(affirmative.message.embed.color, 16744448)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_001_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a ivysaur with maxiv filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.ivysaur))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.ivysaur2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		const zerotemplate = JSON.stringify(_.cloneDeep(testData.monsters.ivysaur3))
		let zeroMessage = mustache.render(zerotemplate, view)
		zeroMessage = JSON.parse(zeroMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage), monsterController.handle(zeroMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			const zero = work[2]
			chai.assert.equal(affirmative.emoji[0], '🌿')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_002_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			zero.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a venusaur with cp filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.venusaur))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.venusaur2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🌿')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_003_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a charmander with maxcp filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmander))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmander2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔥')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_004_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a charmeleon with min_level filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmeleon))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charmeleon2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔥')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_005_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a charizard with max_level filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charizard))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.charizard2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔥')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_006_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a squirtle with atk filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.squirtle))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.squirtle2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '💧')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_007_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a wartortle with def filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.wartortle))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.wartortle2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '💧')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_008_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a blastoise with sta filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.blastoise))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.blastoise2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '💧')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_009_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a caterpie with weight filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.caterpie))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.caterpie2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_010_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a metapod with maxweight filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.metapod))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.metapod2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_011_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a unown with form filter', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.unownf))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.unownd))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🔮')
			chai.assert.equal(affirmative.message.embed.color, 10329501)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_201_06.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	})

	it('should process a butterfree based on distance', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.monsters.butterfree))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.monsters.butterfree2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([monsterController.handle(positiveMessage), monsterController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
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

describe('Raid Filters', () => {

	it('should process a weedle raid', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.weedle))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.weedle2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 7915600)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_013_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process a kakuna ex raid', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.kakuna))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.kakuna2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 7915600)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_014_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)


	it('should process a beedrill instinct raid', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.beedrill))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.beedrill2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '🐛')
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_015_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process a pidgey level 3 raid', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgey))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgey2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '⭕')
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_016_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process a pidgeotto raid by distance', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgeot))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.raids.pidgeot2))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.emoji[0], '⭕')
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_017_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)


})

describe('Egg Filters', () => {
	it('should process level1 park egg', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level1park))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level1))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 12595240)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process level2 egg', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level2))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level3))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 12595240)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process level4 instinct', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level4instinct))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level4mystic))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process level5 dostance', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level5Tartu))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.eggs.level5Tallinn))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([raidController.handle(positiveMessage), raidController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.color, 16306224)
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

})

describe('Quest Filters', () => {

	it('should process porygon award', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.monsterPorygonAward))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.monsterSnorlaxAward))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_137_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process shiny pikachu award', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.monsterShinyPikachuAward))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.monsterNotShinyPikachuAward))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}pokemon_icon_025_00.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process great-ball award', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemGreatBallAward))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemPokeBallAward))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}rewards/reward_2_1.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process stardust award', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.stardust600))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.stardust400))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}rewards/reward_stardust.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

	it('should process awards by distance', (done) => {
		const positivetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemPinapBerryTartu))
		let positiveMessage = mustache.render(positivetemplate, view)
		positiveMessage = JSON.parse(positiveMessage)
		const negativetemplate = JSON.stringify(_.cloneDeep(testData.quests.itemPinapBerryTallinn))
		let negativeMessage = mustache.render(negativetemplate, view)
		negativeMessage = JSON.parse(negativeMessage)

		Promise.all([questController.handle(positiveMessage), questController.handle(negativeMessage)]).then((work) => {
			const affirmative = work[0][0]
			const negative = work[1]
			chai.assert.equal(affirmative.message.embed.thumbnail.url, `${config.general.imgurl}rewards/reward_705_1.png`.toLowerCase())
			negative.should.have.lengthOf(0)
			done()
		}).catch((err) => {
			done(err)
		})
	}).timeout(2000)

})
