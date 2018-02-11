// Require the framework and instantiate it
const fastify = require('fastify')();
const config = require('config');
const log = require("./logger");


// Declare a route

fastify.get('/', function(request, reply){
    reply.type('application/json').code(200);
    return { hello: 'world' }
})


// Run the server!
fastify.listen(config.general.port, config.general.host, function (err) {
    if (err) throw err;
    log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
});