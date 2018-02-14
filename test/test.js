const config = require('config');
const query = require('../app/src/sql/queries');
const google = require('../app/src/geo/google');
const Discordjs = require('discord.js');
const client = new Discordjs.Client();
let token = config.discord.token;
let sender = require("../app/src/send");
const log = require("../app/src/logger");
const fastify = require('fastify')();
let chai = require('chai');


describe('Functional', function() {

    it('Configs should exist and JSON happy', function(done) {
        chai.assert.isObject(require('../config/dts.json'),'dts config is there');
        chai.assert.isObject(require('../config/default.json'),'dts config is there');
        done()
    });

    it('Database connection should be happy', function(done) {
        query.countQuery('TABLE_NAME','information_schema.tables','table_schema',config.db.database, function (err, tables) {
            if (err) done(err);
            else done();
        });
    });

    it('Bunnywabbit connection should be happy', function(done) {

        let data = {
            id : 'AMQP TEST',
            url : 'https://github.com/KartulUdus/PoracleJS',
            name : 'AMQP TEST',
            description : 'AMQP TEST',
            latitude : 0,
            longitude : 0
        };
        sender.sendTestHook('gym_details', data, function(err){
            if (err) done(err);
            else done();
        });
    });

    it('Discord token & owner should be happy', function(done) {
        client.login(token);
        client.on('ready', () => {
            let user = client.users.get(config.discord.admins[0]);
            user.send('This Is A Test Message').catch(error => done(error)).finally(done());
        });
    });

    it('Google key should be happy', function(done) {
        google.geolocate('Tallinn Estonia', function(err, restul) {
            if (err) done(err);
            else done();
        })
    });

    it('Fastify should be happy', function(done) {

        fastify.listen(config.general.port, config.general.host, function (err) {
            if (err) done(err);
            else done();
        });
    });

});
