#!/usr/bin/env node
const amqp = require('amqplib/callback_api');
const config = require('config');
const log = require('../../logger');


module.exports = {

    connection: function (callback){

        amqp.connect(config.rabbit.conn, function (err, conn) {

            if(err) log.error(err);
            callback(err, conn);

        })

    }
};