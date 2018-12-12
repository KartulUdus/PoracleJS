const config = require('config');
const prettyjson = require('prettyjson');
const fastify = require('fastify')();
const log = require('./logger');
const sender = require('./send');
const query = require('./sql/queries');
const migrator = require('./sql/migration/migrator');

const opts = {
	schema: {
		response: {
			200: {
				type: 'object',
				properties: {
					Webserver: { type: 'string' },
				},
			},
		},
	},
};

// webserver healthcheck

fastify.get('/', opts, (request, reply) => {
	reply.type('application/json').code(200);
	reply.send({ Webserver: 'Happy' });
});

// receive hooks


fastify.post('/', opts, (request, reply) => {
	request.body.forEach((hook) => {
		log.debug(prettyjson.render(hook));
		sender.sendHooks(hook.type, hook.message);
	});
	reply.type('application/json').code(200);
	reply.send({ Webserver: 'Happy' });
});


fastify.listen(config.general.port, config.general.host, (err) => {
	if (err) throw err;
	log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`);
});

// db_schema version check

query.countQuery('TABLE_NAME', 'information_schema.tables', 'table_schema', config.db.database, (err, tables) => {
	if (tables === 0) {
		log.info('No tables detected, running all migrations');
		migrator.migration1((result) => {
			log.info(result);
			migrator.migration2((result2) => {
				log.info(result2);
				migrator.migration3((result3) => {
					log.info(result3);
					migrator.migration4((result4) => {
						log.info(result4);
					});
				});
			});
		});
	}
	else {
		query.selectOneQuery('schema_version', 'key', 'db_version', (erro, res) => {
			if (res.val === 1) {
				log.info(`Database version ${res.val} not ok, doing magic ...`);
				migrator.migration2((result) => {
					log.info(result);
				});
			}
			if (res.val === 2) {
				log.info(`Database version ${res.val} not ok, doing magic ...`);
				migrator.migration3((result) => {
					log.info(result);
				});
			}
			if (res.val === 3) {
				log.info(`Database version ${res.val} not ok, doing magic ...`);
				migrator.migration4((result) => {
					log.info(result);
				});
			}
			if (res.val === 4) {
				log.info(`Database version ${res.val} is ok`);
			}
		});
	}
});
