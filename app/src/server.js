const config = require('config');
const prettyjson = require('prettyjson');
const fastify = require('fastify')();
const log = require("./logger");
const sender = require("./send");
const query = require('./sql/queries');
const migrator = require('./sql/migration/migrator');
const amqpc = require('util/helpers/AMQPConnHelper');

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

let connection = undefined;

//webserver healthcheck

    fastify.get('/', opts, function (request, reply){
        reply.type('application/json').code(200);
        reply.send({ Webserver: 'Happy' });
    });

//receive hooks


fastify.post('/', opts, function(request, reply){
    request.body.forEach(function(hook){
        log.debug(prettyjson.render(hook));
        sender.sendHooks(connection, hook.type, hook.message);
    });
    reply.type('application/json').code(200);
    reply.send({ Webserver: 'Happy' });
});


fastify.listen(config.general.port, config.general.host, function (err) {
    if (err) throw err;
    amqpc.connection(function(err, conn){
       if(err){ log.error(`AMQP Not happy, please check bunnywabbit ${err}`);
       throw err;
       }
       connection = conn;
    });
    log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
});

// db_schema version check

query.countQuery('TABLE_NAME','information_schema.tables','table_schema',config.db.database, function (err, tables) {
    if(tables === 0){
        log.info('No tables detected, running mysql base migration');
        migrator.migration1()
    }
});

