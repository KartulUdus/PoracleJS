module.exports = function route(fastify, opts, next) {

	fastify.get('/', (req, reply) => {
		reply.send({ webserver: 'happy' })
	})
	next()
}
