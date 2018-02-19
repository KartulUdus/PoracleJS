#!/usr/bin/env node
const client = require('./discord/client');
const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const config = require('config');
const prettyjson = require('prettyjson');
const log = require('./logger');


client.on('ready', () => {

    amqp.connect(config.rabbit.conn, function (err, conn) {
        log.info('potato');
        conn.createChannel(function (err, ch) {
            let q = 'pokemon';
            let p = ch.assertQueue(q);
            log.error(p);
        })
    })


})