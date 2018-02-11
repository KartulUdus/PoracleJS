const config = require('config');
const prettyjson = require('prettyjson');
const fastify = require('fastify')();
const log = require("./logger");
const sender = require("./send");
const query = require('./sql/queries');
const migrator = require('./sql/migration/migrator');

const opts = {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    Webserver: { type: 'string' }
                }
            }
        }
    }
};

//webserver healthcheck

    fastify.get('/', opts, function (request, reply){
    reply.type('application/json').code(200);
    reply.send({ Webserver: 'Happy' });
    });

//receive hooks


fastify.post('/', opts, function(request, reply){
    request.body.forEach(function(hook){
        log.debug(prettyjson.render(hook));
        sender.sendHooks(hook.type, hook.message);
    });
    reply.type('application/json').code(200);
    reply.send({ Webserver: 'Happy' });
});


fastify.listen(config.general.port, config.general.host, function (err) {
    if (err) throw err;
    log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
});

// db_schema version check

query.countQuery('TABLE_NAME','information_schema.tables','table_schema',config.db.database, function (err, tables) {
    //log.debug(baseMigration);
    if(tables === 0){
        log.info('No tables detected, running mysql base migration');
        migrator.migration1()
    }
});

