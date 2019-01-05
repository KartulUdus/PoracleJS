const handler = require('../handlers/staticMap')

const schema = {

	querystring: {
		type: 'object',
		properties: {
			lat: { type: 'number' },
			lon: { type: 'number' }
		},
		required: ['lat', 'lon']
	}
}

module.exports = function route(fastify, opts, next) {
	fastify.get('/', { schema }, handler)
	next()
}
