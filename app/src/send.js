#!/usr/bin/env node
const amqp = require('amqplib/callback_api');
const config = require('config');
const log = require('./logger');
const Cache = require('ttl');
let cache = new Cache({
    ttl: 300 * 1000
});

cache.on('put', function(key, val, ttl) { });

module.exports = {

    sendHooks: function(conn, queue, data) {

        if(queue === 'pokemon' || queue === 'raid' || queue === 'gym_details') {
            if(queue === 'pokemon'){
                if(cache.get(data.encounter_id) === undefined){
                    cache.put(data.encounter_id, 'cached');
                    sendRabbitMQ(conn, queue, data)
                } else log.warn(`Encounter ${data.encounter_id} was sent again too fast`)
            }else if(queue === 'raid'){
                if(cache.get(data.gym_id) === undefined) {
                    cache.put(data.gym_id, 'cachedGym');
                    sendRabbitMQ(conn, queue, data)
                } else log.warn(`Encounter ${data.gym_id} was sent again too fast`)
            } else sendRabbitMQ(conn, queue, data);
        }
    },
    sendTestHook: function(queue, data, callback) {

        amqp.connect(config.rabbit.conn, function (err, conn) {
            conn.createChannel(function (err, ch) {
                let q = queue;
                ch.assertQueue(q, {durable: false});
                ch.sendToQueue(q, new Buffer(JSON.stringify(data)), {persistent: true});
                log.info("Sent " + queue + " to bunnywabbit");
                callback(err);
            });
            setTimeout(function () {
                conn.close();
            }, 500);
        });
    }
};

function sendRabbitMQ(conn, queue, data){

        conn.createChannel(function (err, ch) {
            let q = queue;
            ch.assertQueue(q, {durable: false});
            ch.sendToQueue(q, new Buffer(JSON.stringify(data)), {persistent: true});
            log.debug("Sent " + queue + " to bunnywabbit");
        });
        setTimeout(function () {
            conn.close();
        }, 500);
}