require('dotenv').config()
require('./helpers/configCreator')()
require('./helpers/migrator')()
const _ = require('lodash')
const path = require('path')
const config = require('config')
const fastify = require('fastify')()
const log = require('./logger')
const cp = require('child_process')
const nuxtConfig = require('./statistics/nuxt.config.js')
cp.fork(`${__dirname}/helpers/commando.js`)


fastify
	.post('/', {}, require('./handlers/receiver'))
	.register(require('fastify-static'), {
		root: path.join(__dirname, '../logs/'),
		prefix: '/logs/'
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
	.register(require('./helpers/nuxt'), {
		config: nuxtConfig
	})
	.after((e) => {
		if (e) log.error(e)
		fastify.nuxt('/')
		fastify.nuxt('/pokemon')
		fastify.nuxt('/raid')
		fastify.nuxt('/logs')

	})

const start = async () => {
	try {
		await fastify.listen(config.general.port, config.general.host)
		log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
	}
	catch (err) {
		log.error(err)
	}
}

start()

