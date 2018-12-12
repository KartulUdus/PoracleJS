module.exports = function (fastify, opts, next) {

	fastify.post('/', {
		schema: {
			description: 'POST Pokémon || Raid || Egg',
			response: {
				201: {
					description: 'Succesful response',
					type: 'object',
					properties: {
						webserver: { type: 'string' },
						userId: { type: 'string' },
						exists: { type: 'boolean' },
						message: { type: 'string' }
					}
				}
			},

		}
	}, require('../handlers/receiver'))

	next()
}
