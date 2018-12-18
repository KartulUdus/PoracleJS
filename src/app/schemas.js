module.exports = function (fastify, opts, next) {

	fastify.addSchema({
		$id: 'userId',
		type: 'object',
		properties: {
			userId: {
				type: 'string',
				description: 'user id'
			}
		}

	})
	next()
}