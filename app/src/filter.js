#!/usr/bin/env node
const client = require('./discord/client');
const _ = require('lodash');
const amqp = require('amqplib/callback_api');
const config = require('config');
const prettyjson = require('prettyjson');
const log = require('./logger');
const query = require('./sql/queries');
const gmaps = require('./geo/google');
const mustache = require('mustache');
const monsterData = require(config.locale.monstersJson);
const formData = require('./util/forms');
const teamData = require('./util/teams');
const raidCpData = require('./util/raidcp');
const dts = require('../../config/dts');
const moveData = require(config.locale.movesJson);
const moment = require('moment');
let gkey = config.gmaps.key;
require('moment-precise-range-plugin');
moment.locale(config.locale.timeformat);

client.on('ready', () => {

    amqp.connect(config.rabbit.conn, function (err, conn) {
        conn.createChannel(function (err, ch) {
            let q = 'pokemon';
            ch.assertQueue(q, {durable: false});
            log.debug(`Reading ${q} bunnywabbit`);
            ch.consume(q, function (msg) {
                let data = JSON.parse(msg.content.toString());
                data.rocketmap = config.gmaps.rocketmap.concat(`?lat=${data.latitude}&lon=${data.longitude}`);
                data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${gkey}`;
                data.name = monsterData[data.pokemon_id].name;
                if (data.individual_attack === null) {
                    data.iv = -1;
                    data.individual_attack = 0;
                    data.individual_defense = 0;
                    data.individual_stamina = 0;
                    data.cp = 0;
                    data.pokemon_level = 0;
                    data.move_1 = 0;
                    data.move_2 = 0;
                    data.weight = 0;
                    data.quick_move = '';
                    data.charge_move = '';
                } else {
                    data.iv = ((data.individual_attack + data.individual_defense + data.individual_stamina) / 45 * 100).toFixed(2);
                    data.weight = data.weight.toFixed(1);
                    data.quick_move = moveData[data.move_1].name;
                    data.charge_move = moveData[data.move_2].name;
                }
                data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
                data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
                data.color = monsterData[data.pokemon_id].types[0].color;
                data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true);
                data.distime = moment(data.disappear_time * 1000).format(config.locale.time);
                data.imgurl = `${config.general.imgurl}${data.pokemon_id}`;
                let e = [];
                data.emoji = monsterData[data.pokemon_id].types.forEach(function (type) {
                    e.push(type.emoji)
                });
                if (data.form !== null && data.form !== 0) {
                    data.formname = formData[data.pokemon_id][data.form];
                    data.imgurl = data.imgurl.concat(`-${data.formname}.png`);
                } else data.imgurl = data.imgurl.concat(`.png`);
                if (data.tth.firstDateWasLater !== true) {

                    gmaps.pointInArea([data.latitude, data.longitude], function (matched) {
                        data.matched = matched;

                        query.monsterWhoCares(data, function (whocares) {
                            if (whocares.length !== 0) {

                                gmaps.getAddress({lat: data.latitude, lon: data.longitude}, function (err, geoResult) {

                                    let view = {
                                        time: data.distime,
                                        tthh: data.tth.hours,
                                        tthm: data.tth.minutes,
                                        tths: data.tth.seconds,
                                        name: data.name,
                                        move1: data.quick_move,
                                        move2: data.charge_move,
                                        iv: data.iv,
                                        cp: data.cp,
                                        level: data.pokemon_level,
                                        atk: data.individual_attack,
                                        def: data.individual_defense,
                                        sta: data.individual_stamina,
                                        weight: data.weight,
                                        staticmap: data.staticmap,
                                        mapurl: data.mapurl,
                                        applemap : data.applemap,
                                        rocketmap: data.rocketmap,
                                        form: data.formname,
                                        imgurl: data.imgurl.toLowerCase(),
                                        color: data.color,
                                        // geocode stuff
                                        addr: geoResult.addr,
                                        streetNumber: geoResult.streetNumber,
                                        streetName: geoResult.streetName,
                                        zipcode: geoResult.zipcode,
                                        country: geoResult.country,
                                        countryCode: geoResult.countryCode,
                                        city: geoResult.city,
                                        state: geoResult.state,
                                        stateCode: geoResult.stateCode
                                    };

                                     let monsterDts = data.iv == -1 && dts.monsterNoIv
                                                    ? dts.monsterNoIv
                                                    : dts.monster;
                                    let template = JSON.stringify(monsterDts);
                                    let message = mustache.render(template, view);
                                    message = JSON.parse(message);
                                    whocares.forEach(function (cares) {

                                        sendDMAlarm(message, cares.id, e, cares.map_enabled);
                                        log.info(`Alerted ${cares.name} about ${data.name} monster`);
                                    })
                                });
                            }
                        })
                    });
                } else log.warn(`Weird, the ${data.name} already disappeared`)
            }, {noAck: true});
        });
    });

    amqp.connect(config.rabbit.conn, function (err, conn) {
        conn.createChannel(function (err, ch) {
            let q = 'raid';

            ch.assertQueue(q, {durable: false});
            log.debug(`Reading ${q} bunnywabbit`);
            ch.consume(q, function (msg) {
                let data = JSON.parse(msg.content.toString());

                if (data.pokemon_id !== null && data.pokemon_id !== undefined && data.pokemon_id !== 0) {
                    data.rocketmap = config.gmaps.rocketmap.concat(`?lat=${data.latitude}&lon=${data.longitude}`);
                    data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
                    data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
                    data.tth = moment.preciseDiff(Date.now(), data.end * 1000, true);
                    data.distime = moment(data.end * 1000).format(config.locale.time);
                    data.name = monsterData[data.pokemon_id].name;
                    data.imgurl = `${config.general.imgurl}${data.pokemon_id}.png`;
                    let e = [];
                    data.emoji = monsterData[data.pokemon_id].types.forEach(function (type) {
                        e.push(type.emoji)
                    });
                    data.teamname = teamData[data.team_id].name;
                    data.color = teamData[data.team_id].color;
                    data.quick_move = moveData[data.move_1].name;
                    data.charge_move = moveData[data.move_2].name;
                    data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${gkey}`;

                    query.selectOneQuery('gym-info', 'id', data.gym_id, function (err, gym) {
                        if (gym !== undefined) {
                            data.gymname = gym.gym_name;
                            data.description = gym.description;
                            data.url = gym.url;
                            data.park = gym.park;
                            log.debug(prettyjson.render(data));
                            if (data.tth.firstDateWasLater !== true) {

                                gmaps.pointInArea([data.latitude, data.longitude], function (matched) {
                                    data.matched = matched;

                                    query.raidWhoCares(data, function (whocares) {
                                        if (whocares.length !== 0) {
                                            gmaps.getAddress({
                                                lat: data.latitude,
                                                lon: data.longitude
                                            }, function (err, geoResult) {

                                                let view = {
                                                    time: data.distime,
                                                    tthh: data.tth.hours,
                                                    tthm: data.tth.minutes,
                                                    tths: data.tth.seconds,
                                                    name: data.name,
                                                    cp20: raidCpData[data.pokemon_id].max_cp_20,
                                                    cp25: raidCpData[data.pokemon_id].max_cp_25,
                                                    mincp20: raidCpData[data.pokemon_id].min_cp_20,
                                                    mincp25: raidCpData[data.pokemon_id].min_cp_25,
                                                    gymname: data.gymname,
                                                    description: data.description,
                                                    move1: data.quick_move,
                                                    move2: data.charge_move,
                                                    level: data.level,
                                                    staticmap: data.staticmap,
                                                    detailsurl: data.url,
                                                    mapurl: data.mapurl,
                                                    applemap: data.applemap,
                                                    rocketmap: data.rocketmap,
                                                    imgurl: data.imgurl.toLowerCase(),
                                                    color: data.color,
                                                    // geocode stuff
                                                    addr: geoResult.addr,
                                                    streetNumber: geoResult.streetNumber,
                                                    streetName: geoResult.streetName,
                                                    zipcode: geoResult.zipcode,
                                                    country: geoResult.country,
                                                    countryCode: geoResult.countryCode,
                                                    city: geoResult.city,
                                                    state: geoResult.state,
                                                    stateCode: geoResult.stateCode
                                                };

                                                let template = JSON.stringify(dts.raid);
                                                let message = mustache.render(template, view);
                                                log.debug(message);
                                                message = JSON.parse(message);
                                                whocares.forEach(function (cares) {


                                                    sendDMAlarm(message, cares.id, e, cares.map_enabled);
                                                    log.info(`Alerted ${cares.name} about ${data.name} raid`);


                                                    query.addOneQuery('humans', 'alerts_sent', 'id', cares.id);

                                                });
                                            });
                                        }
                                    })
                                });
                            }
                        } else log.warn(`Raid against ${data.name} appeared; alas, I did not have gym-details`);
                    });
                } else {
                    data.rocketmap = config.gmaps.rocketmap.concat(`?lat=${data.latitude}&lon=${data.longitude}`);
                    data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
                    data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
                    data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true);
                    data.hatchtime = moment(data.start * 1000).format(config.locale.time);
                    data.imgurl = `${config.general.imgurl}egg${data.level}.png`;
                    data.teamname = teamData[data.team_id].name;
                    data.color = teamData[data.team_id].color;
                    data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${gkey}`;

                    query.selectOneQuery('gym-info', 'id', data.gym_id, function (err, gym) {
                        if (gym !== undefined) {
                            data.gymname = gym.gym_name;
                            data.description = gym.description;
                            data.url = gym.url;
                            data.park = gym.park;
                            if (data.tth.firstDateWasLater !== true) {
                                gmaps.pointInArea([data.latitude, data.longitude], function (matched) {
                                    data.matched = matched;

                                    query.eggWhoCares(data, function (whocares) {
                                        if (whocares.length !== 0) {
                                            gmaps.getAddress({
                                                lat: data.latitude,
                                                lon: data.longitude
                                            }, function (err, geoResult) {

                                                let view = {
                                                    time: data.hatchtime,
                                                    tthh: data.tth.hours,
                                                    tthm: data.tth.minutes,
                                                    tths: data.tth.seconds,
                                                    gymname: data.gymname,
                                                    description: data.description,
                                                    level: data.level,
                                                    staticmap: data.staticmap,
                                                    detailsurl: data.url,
                                                    mapurl: data.mapurl,
                                                    applemap: data.applemap,
                                                    rocketmap: data.rocketmap,
                                                    imgurl: data.imgurl.toLowerCase(),
                                                    color: data.color,
                                                    // geocode stuff
                                                    addr: geoResult.addr,
                                                    streetNumber: geoResult.streetNumber,
                                                    streetName: geoResult.streetName,
                                                    zipcode: geoResult.zipcode,
                                                    country: geoResult.country,
                                                    countryCode: geoResult.countryCode,
                                                    city: geoResult.city,
                                                    state: geoResult.state,
                                                    stateCode: geoResult.stateCode
                                                };

                                                let template = JSON.stringify(dts.egg);
                                                let message = mustache.render(template, view);
                                                log.debug(message);
                                                message = JSON.parse(message);
                                                whocares.forEach(function (cares) {

                                                    sendDMAlarm(message, cares.id, [], cares.map_enabled);
                                                    log.info(`Alerted ${cares.name} about ${data.name} raid`);
                                                });
                                            });
                                        }
                                    })
                                });
                            }
                        } else log.warn(`Raid against ${data.name} appeared; alas, I did not have gym-details`);
                    });
                }
            }, {noAck: true});
        });
    });


    amqp.connect(config.rabbit.conn, function (err, conn) {
        conn.createChannel(function (err, ch) {
            let q = 'gym_details';

            ch.assertQueue(q, {durable: false});
            log.debug(`Reading ${q} bunnywabbit`);
            ch.consume(q, function (msg) {
                let data = JSON.parse(msg.content.toString());
                query.countQuery(`id`, `gym-info`, `id`, data.id, function (err, exists) {
                    if (exists === 0) {
                        data.name = data.name.replace(/"/g,"");
                        data.description = data.description.replace(/"/g,"");
                        query.insertQuery('gym-info',
                            ['`id`', '`gym_name`', '`description`', '`url`', '`latitude`', '`longitude`'],
                            [`${data.id}`, `${data.name}`, `${data.description}`, `${data.url}`, `${data.latitude}`, `${data.longitude}`]);
                        log.info(`Saved gym-details for ${data.name}`);
                    }
                })
            }, {noAck: true});
        });
    });

})

function sendDMAlarm(message, human, e, map) {

    let finalMessage = _.cloneDeep(message);
    if (map === 0) finalMessage.embed.image.url = '';
    let user = client.users.get(human);
    let channel = client.channels.get(human);
    if (user === undefined) user = client.channels.get(human);
    if (user !== undefined && channel !== undefined) {
        query.addOneQuery('humans','alerts_sent','id',human);
        user.send(finalMessage).then(msg => {
            if(config.discord.typereact){
                let humanCheck = client.users.get(human);
                if (humanCheck === undefined) {
                    e.forEach(function (emoji) {
                        client.channels.get(human).lastMessage.react(emoji)
                    });
                } else {
                    e.forEach(function (emoji) {
                        client.users.get(human).dmChannel.lastMessage.react(emoji)
                    })
                }
            }
        })
    } else log.warn(`Tried to send message to ID ${human}, but didn't find it`);
}
