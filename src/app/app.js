
const config = require('config')
const prettyjson = require('prettyjson')
const fastify = require('fastify')()
const log = require('./logger')
const cp = require('child_process')


// register schema and routes

fastify.register(require('./schemas'))
	.register(require('./routes/healthcheck'))
	.register(require('./routes/receiver'))


const start = async () => {
	try {
		await fastify.listen(config.general.port, config.general.host)
		log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
		log.info(`server available routes are ${fastify.printRoutes()}`)

	} catch (err) {
		log.error(err)
	}
}


start()

