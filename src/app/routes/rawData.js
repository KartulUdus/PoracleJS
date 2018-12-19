module.exports = function (fastify, opts, next) {

	fastify.get('/rawdata',
		{
		},
		require('../handlers/rawData.js'))
	next()
}
