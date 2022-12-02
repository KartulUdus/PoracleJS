const { assert } = require('chai')
const config = require('config')
const { log } = require('../../../../src/lib/logger')
const Discord = require('../../../mocks/FakeDiscord')
const discordMessaveValidator = require('../../../mocks/discordMessageValidator')
const mustache = require('../../../../src/lib/handlebars')()
const { getKnex } = require('../../../../src/lib/configFetcher')
const Controller = require('../../../../src/controllers/controller')
const Translator = require('../../../../src/util/translate')
const messageContentParser = require('../../../mocks/parseCommand')

const translator = new Translator(config.general.locale)
const knex = getKnex(
	{
		database: {
			client: 'sqlite',
		},
	},
)
const controller = new Controller(knex, config)
const location = require('../../../../src/lib/discord/commando/commands/location')

const client = new Discord(controller, config, log, mustache, translator)

const testMessages = require('../../../testData/commandMessages')(client)

describe('!location command tests', () => {

	beforeEach(async () => {
		await knex('humans').truncate()
		client.setDefaults()
		testMessages.location.humans.map(async (h) => {
			await controller.insertQuery('humans', h)
		})
	})

	it('Should update the location of a registered user', async () => {
		await location.run(client, testMessages.location.happy, messageContentParser(client, testMessages.location.happy.content))
		const result = await controller.selectOneQuery('humans', { id: '222' })
		assert.equal(result.latitude, 59.4372155)
		assert.equal(result.longitude, 24.7453688)
		assert.equal(client.lastReact, '✅')
		assert.equal(client.lastMessage, ':wave:, I set registeredUserInTallinns location to : \nhttps://maps.google.com/maps?q=59.4372155,24.7453688')
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})

	it('Should ignore !location of an unregistered user', async () => {
		await location.run(client, testMessages.location.sad, messageContentParser(client, testMessages.location.sad.content))
		const result = await controller.selectOneQuery('humans', { id: '15867' })
		assert.notExists(result)
		assert.equal(client.lastReact, '🙅')
		assert.equal(client.lastMessage, '')
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})

	it('Should update location of a channel when admin asks', async () => {
		await location.run(client, testMessages.location.happyAdmin, messageContentParser(client, testMessages.location.happyAdmin.content))
		const result = await controller.selectOneQuery('humans', { id: '333' })
		assert.equal(result.latitude, 59.4372155)
		assert.equal(result.longitude, 24.7453688)
		assert.equal(client.lastReact, '✅')
		assert.equal(client.lastMessage, ':wave:, I set adminSetLocationInThisChannels location to : \nhttps://maps.google.com/maps?q=59.4372155,24.7453688')
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})

	it('Should update location of a webhook when admin asks', async () => {
		await location.run(client, testMessages.location.happyAdminWebhook, messageContentParser(client, testMessages.location.happyAdminWebhook.content))
		const result = await controller.selectOneQuery('humans', { name: 'registeredwebhook' })
		assert.equal(result.latitude, 59.4372155)
		assert.equal(result.longitude, 24.7453688)
		assert.equal(client.lastReact, '✅')
		assert.equal(client.lastMessage, ':wave:, I set registeredwebhooks location to : \nhttps://maps.google.com/maps?q=59.4372155,24.7453688')
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})

	it('Should advise accordingly if webhook is not registered and admin asks', async () => {
		await location.run(client, testMessages.location.sadAdminWebhook, messageContentParser(client, testMessages.location.sadAdminWebhook.content))
		assert.equal(client.lastReact, '')
		assert.equal(client.lastMessage, `Webhook registeredwebhookthatdoesntexist does not seem to be registered. add it with ${config.discord.prefix}webhook add <Your-Webhook-url>`)
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})

	it('Should advise accordingly if channel is not registered and admin asks', async () => {
		await location.run(client, testMessages.location.sadAdmin, messageContentParser(client, testMessages.location.sadAdmin.content))
		assert.equal(client.lastReact, '')
		assert.equal(client.lastMessage, `channelUnregistered does not seem to be registered. add it with ${config.discord.prefix}channel add`)
		assert.equal(discordMessaveValidator(client.lastMessage, 'bot'), true)
	})
})
