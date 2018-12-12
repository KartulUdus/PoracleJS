module.exports = function (fastify, opts, next) {

	fastify.get('/', (req, reply) => {
		reply.send({ webserver: 'happy' })
	})
	next()
}
