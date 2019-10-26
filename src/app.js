require('dotenv').config()
require('./helpers/configCreator')()
const _ = require('lodash')
const path = require('path')
const config = require('config')
const fastify = require('fastify')()
const cp = require('child_process')
const log = require('./logger')
const migrator = require('./helpers/migrator')


fastify
	.post('/', {}, require('./handlers/receiver'))
	.register(require('fastify-static'), {
		root: path.join(__dirname, '../logs/'),
		prefix: '/logs/',
	})

fastify
	.setErrorHandler((error, request, reply) => {
		const badMessage = _.filter(error.validation, { message: 'should match exactly one schema in oneOf' })
		badMessage.forEach((bad) => {
			const index = bad.dataPath.replace(/([[\]])/gi, '')
			log.warn(`Fastify failed validation for message ${JSON.stringify(request.body[index])}`)
		})
		reply.send({ message: error.message, request: request.body })
	})

const start = async () => {
	try {
		await migrator()
		if (config.discord.enabled) cp.fork(`${__dirname}/helpers/discordCommando.js`)
		await fastify.listen(config.general.port, config.general.host)
		log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
	}
	catch (err) {
		log.error(err)
		process.exit()
	}
}

start()
