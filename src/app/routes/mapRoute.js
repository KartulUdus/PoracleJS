module.exports = function (fastify, opts, next) {

	fastify.get('/',
		{
		querystring: {
			lat: { type: 'number' },
			lon: { type: 'number' }
			}
		},
		require('../handlers/mapHandler.js'))
	next()
}
