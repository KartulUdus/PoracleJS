const handler = require('../handlers/rawData.js')

const schema =
	{
		params: {
			type: 'object',
			required: ['lat1', 'lat2', 'lon1', 'lon2'],
			properties: {
				lat1: { type: 'number' },
				lat2: { type: 'number' },
				lon1: { type: 'number' },
				lon2: { type: 'number' }
			}

		}
	}

module.exports = function route(fastify, opts, next) {

	fastify.get('/raw/:lat1/:lat2/:lon1/:lon2', { schema },	handler)
	next()
}
