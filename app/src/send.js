#!/usr/bin/env node
const amqp = require('amqplib/callback_api');
const config = require('config');
const log = require('./logger');
const Cache = require('ttl');

const cache = new Cache({
	ttl: 300 * 1000,
});

cache.on('put', (key, val, ttl) => { });


function sendRabbitMQ(queue, data) {

	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((erro, ch) => {
			const q = queue;
			ch.assertQueue(q, { durable: false });
			ch.sendToQueue(q, Buffer.from(JSON.stringify(data)), { persistent: true });
			log.debug(`Sent ${queue} to bunnywabbit`);
		});
		setTimeout(() => {
			conn.close();
		}, 500);
	});
}


function sendHooks(queue, data) {

	if (queue === 'pokemon' || queue === 'raid' || queue === 'gym_details' || queue === 'gym' || queue === 'quest') {
		if (queue === 'pokemon') {
			if (cache.get(data.encounter_id) === undefined) {
				cache.put(data.encounter_id, 'cached');
				sendRabbitMQ(queue, data);
			}
			else log.warn(`Monster ${data.encounter_id} was sent again too soon`);
		}
		else if (queue === 'raid') {
			const raidPkmn = !data.pokemon_id || data.pokemon_id === 0 ? 0 : data.pokemon_id;
			const cacheId = `${data.gym_id}_${raidPkmn}`;

			if (cache.get(cacheId) === undefined) {

				cache.put(cacheId, 'cachedRaid');
				sendRabbitMQ(queue, data);
			}
			else log.warn(`Raid on ${data.gym_id} was sent again too soon`);

		}
		else sendRabbitMQ(queue, data);
	}
}
function sendTestHook(queue, data, callback) {

	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((erro, ch) => {
			const q = queue;
			ch.assertQueue(q, { durable: false });
			ch.sendToQueue(q, Buffer.from(JSON.stringify(data)), { persistent: true });
			log.info(`Sent ${queue} to bunnywabbit`);
			callback(erro);
		});
		setTimeout(() => {
			conn.close();
		}, 500);
	});

}

module.exports = {
	sendTestHook,
	sendHooks,
};

