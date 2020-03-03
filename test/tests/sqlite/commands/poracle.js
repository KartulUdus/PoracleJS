const { assert } = require('chai')
const config = require('config')
const { log } = require('./../../../../src/lib/logger')
const Discord = require('../../../mocks/FakeDiscord')
const discordMessaveValidator = require('../../../mocks/discordMessageValidator')
const mustache = require('./../../../../src/lib/handlebars')()
const { getKnex } = require('./../../../../src/lib/configFetcher')
const Controller = require('./../../../../src/controllers/controller')

const knex = getKnex(
	{
		database: {
			client: 'sqlite',
		},
	},
)
const controller = new Controller(knex, config)
const poracle = require('../../../../src/lib/discord/commando/commands/poracle')

const client = new Discord(controller, config, log, mustache)

const testMessages = require('../../../testData/commandMessages')(client)

describe('!poracle command tests', () => {

	beforeEach(async () => {
		await knex('humans').truncate()
		client.setDefaults()
	})

	it('Should register new human if made from the right channel', async () => {
		await poracle.run(client, testMessages.poracle.happy)
		const result = await controller.selectOneQuery('humans', { id: '222' })
		assert.equal(result.id, '222')
		assert.equal(result.type, 'discord:user')
		assert.equal(result.name, 'happyAuthorsUsername')
		assert.equal(client.lastReact, '✅')
		assert.exists(client.lastMessage.embed)
		assert.equal(client.lastMessage.embed.title, 'Welcome')
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})

	it('Should not register a new human if made from any other channel', async () => {
		await poracle.run(client, testMessages.poracle.sad)
		const result = await controller.selectOneQuery('humans', { id: '222' })
		assert.notExists(result)
		assert.equal(client.lastReact, '')
	})

})
