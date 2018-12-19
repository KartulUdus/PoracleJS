const config = require('config')
const fastify = require('fastify')()
const log = require('./logger')
const path = require('path')
const serveStatic = require('serve-static')


process.on('message', (msg) => {
	console.log(msg.body)
})

fastify
	.use('/static', serveStatic(path.join(__dirname, "/util/static/")))
	.register(require('./routes/mapRoute'))
	.register(require('point-of-view'), {
		engine: {handlebars: require('handlebars')}})
console.log(path.join(__dirname, "/util/static/"))


const start = async () => {
	try {
		await fastify.listen(config.map.port, config.map.host)
		log.info(`PoracleMap started on ${fastify.server.address().address}:${fastify.server.address().port}`)
		log.info(`server available routes are ${fastify.printRoutes()}`)

	} catch (err) {
		log.error(err)
	}
}

start()

