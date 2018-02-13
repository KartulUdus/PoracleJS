#!/usr/bin/env node
const amqp = require('amqplib/callback_api');
const config = require('config');
const log = require('./logger');


module.exports = {

    sendHooks: function(queue, data) {

        if(queue === 'pokemon' || queue === 'raid' || queue === 'gym-info') {
            amqp.connect(config.rabbit.conn, function (err, conn) {
                conn.createChannel(function (err, ch) {
                    let q = queue;
                    ch.assertQueue(q, {durable: false});
                    ch.sendToQueue(q, new Buffer(JSON.stringify(data)), {persistent: true});
                    log.info("Sent " + queue + " to bunnywabbit");
                });
                setTimeout(function () {
                    conn.close();
                }, 500);
            });
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

