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
const weatherData = require('./util/weather');
const raidCpData = require('./util/raidcp');
const questData = require('./util/quests');
const rewardData = require('./util/rewards');
const dts = require('../../config/dts');

const moveData = require(config.locale.movesJson);
const ivColorData = config.discord.iv_colors;
const moment = require('moment');
const Cache = require('ttl');

const cache = new Cache({
	ttl: config.discord.limitsec * 1000,
});
cache.on('put', (key, val, ttl) => { });
cache.on('hit', (key, val) => { });

const gkey = config.gmaps.key;
require('moment-precise-range-plugin');

moment.locale(config.locale.timeformat);

function sendDMAlarm(message, human, e, map) {

	const ch = _.cloneDeep(cache.get(human));
	if (ch === undefined) {
		cache.put(human, 1);
	}
	else if (ch !== undefined) {
		cache.put(human, ch + 1, cache._store[human].expire - Date.now());
	}
	let finalMessage = _.cloneDeep(message);
	if (map === 0) finalMessage.embed.image.url = '';
	if (cache.get(human) === config.discord.limitamount + 1) finalMessage = `You have reached the limit of ${config.discord.limitamount} messages over ${config.discord.limitsec} seconds`;
	if (cache.get(human) <= config.discord.limitamount + 1) {
		query.addOneQuery('humans', 'alerts_sent', 'id', human);
		if (client.channels.keyArray().includes(human)) {
			client.channels.get(human).send(finalMessage).then((msg) => {
				if (config.discord.typereact) {
					e.forEach((emoji) => {
						msg.react(emoji);
					});
				}
			});
		}
		else if (client.users.keyArray().includes(human)) {
			client.users.get(human).send(finalMessage).then((msg) => {
				if (config.discord.typereact) {
					e.forEach((emoji) => {
						msg.react(emoji);
					});
				}
			});
		}
		else log.warn(`Tried to send message to ID ${human}, but error ocurred`);

	}
	else log.warn(`ID ${human} went over his message quota, ignoring message`);

}


function findIvColor(iv) {

	// it must be perfect if none of the ifs kick in
	// orange / legendary
	let colorIdx = 5;

	if (iv < 25) colorIdx = 0; // gray / trash / missing
	else if (iv < 50) colorIdx = 1; // white / common
	else if (iv < 82) colorIdx = 2; // green / uncommon
	else if (iv < 90) colorIdx = 3; // blue / rare
	else if (iv < 100) colorIdx = 4; // purple epic

	return parseInt(ivColorData[colorIdx].replace(/^#/, ''), 16);
}

client.on('ready', () => {

	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((err, ch) => {
			const q = 'pokemon';
			ch.assertQueue(q, { durable: false });
			log.debug(`Reading ${q} bunnywabbit`);
			ch.consume(q, (msg) => {
				const data = JSON.parse(msg.content.toString());
				data.rocketmap = config.gmaps.rocketmap.concat(`?lat=${data.latitude}&lon=${data.longitude}`);
				data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${gkey}`;
				data.name = monsterData[data.pokemon_id].name;
				data.formname = '';
				if (!data.weight) {
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
				}
				else {
					data.iv = ((data.individual_attack + data.individual_defense + data.individual_stamina) / 0.45).toFixed(2);
					data.weight = data.weight.toFixed(1);
					data.quick_move = moveData[data.move_1].name;
					data.charge_move = moveData[data.move_2].name;
				}
				if (data.form === undefined || data.form === null) data.form = 0;
				if (!data.weather_boosted_condition) data.weather_boosted_condition = 0;
				data.boost = weatherData[data.weather_boosted_condition].name;
				data.boostemoji = weatherData[data.weather_boosted_condition].emoji;

				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
				data.color = monsterData[data.pokemon_id].types[0].color;
				data.ivcolor = findIvColor(data.iv);
				data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true);
				data.distime = moment(data.disappear_time * 1000).format(config.locale.time);
				data.imgurl = `${config.general.imgurl}${data.pokemon_id}`;
				const e = [];
				data.emoji = monsterData[data.pokemon_id].types.forEach((type) => {
					e.push(type.emoji);
				});
				if (data.form && data.form !== '0' && data.pokemon_id in formData) {
					data.formname = formData[data.pokemon_id][data.form];
					data.imgurl = data.imgurl.concat(`-${data.formname}.png`);
				}
				else data.imgurl = data.imgurl.concat('.png');
				if (data.tth.firstDateWasLater !== true) {

					gmaps.pointInArea([data.latitude, data.longitude], (matched) => {
						data.matched = matched;

						query.monsterWhoCares(data, (whocares) => {
							if (!Array.isArray(whocares)) log.error(`Unable to iterate query result ${whocares}`)
							if (whocares.length !== 0 && Array.isArray(whocares)) {

								gmaps.getAddress({ lat: data.latitude, lon: data.longitude }, (err, geoResult) => {

									const view = {
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
										applemap: data.applemap,
										rocketmap: data.rocketmap,
										form: data.formname,
										imgurl: data.imgurl.toLowerCase(),
										color: data.color,
										ivcolor: data.ivcolor,
										boost: data.boost,
										boostemoji: data.boostemoji,

										// geocode stuff
										addr: geoResult.addr,
										streetNumber: geoResult.streetNumber,
										streetName: geoResult.streetName,
										zipcode: geoResult.zipcode,
										country: geoResult.country,
										countryCode: geoResult.countryCode,
										city: geoResult.city,
										state: geoResult.state,
										stateCode: geoResult.stateCode,
									};

									const monsterDts = data.iv === -1 && dts.monsterNoIv
										? dts.monsterNoIv
										: dts.monster;
									const template = JSON.stringify(monsterDts);
									let message = mustache.render(template, view);
									message = JSON.parse(message);
									log.debug(typeof whocares);
									whocares.forEach((cares) => {
										log.debug(cares)
										sendDMAlarm(message, cares.id, e, cares.map_enabled);
										log.info(`Alerted ${cares.name} about ${data.name} monster`);
									});
								});
							}
						});
					});
				}
				else log.warn(`Weird, the ${data.name} already disappeared`);
			}, { noAck: true });
		});
	});

	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((err, ch) => {
			const q = 'raid';

			ch.assertQueue(q, { durable: false });
			log.debug(`Reading ${q} bunnywabbit`);
			ch.consume(q, (msg) => {
				const data = JSON.parse(msg.content.toString());

				if (data.pokemon_id !== null && data.pokemon_id !== undefined && data.pokemon_id !== 0) {
					data.rocketmap = config.gmaps.rocketmap.concat(`?lat=${data.latitude}&lon=${data.longitude}`);
					data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
					data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
					data.tth = moment.preciseDiff(Date.now(), data.end * 1000, true);
					data.distime = moment(data.end * 1000).format(config.locale.time);
					data.name = monsterData[data.pokemon_id].name;
					data.imgurl = `${config.general.imgurl}${data.pokemon_id}.png`;
					const e = [];
					data.emoji = monsterData[data.pokemon_id].types.forEach((type) => {
						e.push(type.emoji);
					});
					data.teamname = teamData[data.team_id].name;
					data.color = teamData[data.team_id].color;
					data.quick_move = moveData[data.move_1].name;
					data.charge_move = moveData[data.move_2].name;
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${gkey}`;

					query.selectOneQuery('gym-info', 'id', data.gym_id, (err, gym) => {
						if (gym !== undefined) {
							data.gymname = gym.gym_name;
							data.description = gym.description;
							data.url = gym.url;
							data.park = gym.park;
							data.ex = '';
							if (gym.park) data.ex = 'EX';
							log.debug(prettyjson.render(data));
							if (data.tth.firstDateWasLater !== true) {

								gmaps.pointInArea([data.latitude, data.longitude], (matched) => {
									data.matched = matched;

									query.raidWhoCares(data, (whocares) => {
										if (!Array.isArray(whocares)) log.error(`Unable to iterate query result ${whocares}`)
										if (whocares.length !== 0 && Array.isArray(whocares)) {
											gmaps.getAddress({
												lat: data.latitude,
												lon: data.longitude,
											}, (err, geoResult) => {

												const view = {
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
													ex: data.ex,
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
													stateCode: geoResult.stateCode,
												};

												const template = JSON.stringify(dts.raid);
												let message = mustache.render(template, view);
												log.debug(message);
												message = JSON.parse(message);
												whocares.forEach((cares) => {


													sendDMAlarm(message, cares.id, e, cares.map_enabled);
													log.info(`Alerted ${cares.name} about ${data.name} raid`);


													query.addOneQuery('humans', 'alerts_sent', 'id', cares.id);

												});
											});
										}
									});
								});
							}
						}
						else log.warn(`Raid against ${data.name} appeared; alas, I did not have gym-details`);
					});
				}
				else {
					data.rocketmap = config.gmaps.rocketmap.concat(`?lat=${data.latitude}&lon=${data.longitude}`);
					data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
					data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
					data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true);
					data.hatchtime = moment(data.start * 1000).format(config.locale.time);
					data.imgurl = `${config.general.imgurl}egg${data.level}.png`;
					data.teamname = teamData[data.team_id].name;
					data.color = teamData[data.team_id].color;
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${config.gmaps.type}&zoom=${config.gmaps.zoom}&size=${config.gmaps.width}x${config.gmaps.height}&key=${gkey}`;

					query.selectOneQuery('gym-info', 'id', data.gym_id, (err, gym) => {
						if (gym !== undefined) {
							data.gymname = gym.gym_name;
							data.description = gym.description;
							data.url = gym.url;
							data.park = gym.park;
							data.ex = '';
							if (gym.park) data.ex = 'EX';
							if (data.tth.firstDateWasLater !== true) {
								gmaps.pointInArea([data.latitude, data.longitude], (matched) => {
									data.matched = matched;

									query.eggWhoCares(data, (whocares) => {
										if (!Array.isArray(whocares)) log.error(`Unable to iterate query result ${whocares}`)
										if (whocares.length !== 0 && Array.isArray(whocares)) {
											gmaps.getAddress({
												lat: data.latitude,
												lon: data.longitude,
											}, (err, geoResult) => {

												const view = {
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
													ex: data.ex,
													// geocode stuff
													addr: geoResult.addr,
													streetNumber: geoResult.streetNumber,
													streetName: geoResult.streetName,
													zipcode: geoResult.zipcode,
													country: geoResult.country,
													countryCode: geoResult.countryCode,
													city: geoResult.city,
													state: geoResult.state,
													stateCode: geoResult.stateCode,
												};

												const template = JSON.stringify(dts.egg);
												let message = mustache.render(template, view);
												log.debug(message);
												message = JSON.parse(message);
												whocares.forEach((cares) => {

													sendDMAlarm(message, cares.id, [], cares.map_enabled);
													log.info(`Alerted ${cares.name} about ${data.name} raid`);
												});
											});
										}
									});
								});
							}
						}
						else log.warn(`Raid against ${data.name} appeared; alas, I did not have gym-details`);
					});
				}
			}, { noAck: true });
		});
	});


	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((err, ch) => {
			const q = 'gym_details';

			ch.assertQueue(q, { durable: false });
			log.debug(`Reading ${q} bunnywabbit`);
			ch.consume(q, (msg) => {
				const data = JSON.parse(msg.content.toString());
				query.countQuery('id', 'gym-info', 'id', data.id, (err, exists) => {
					if (exists === 0) {
						if (!data.description) data.description = '';
						data.name = data.name.replace(/"/g, '');
						data.description = data.description.replace(/"/g, '');
						data.name = data.name.replace(/\n/g, '');
						data.description = data.description.replace(/\n/g, '');
						query.insertQuery(
							'gym-info',
							['`id`', '`gym_name`', '`description`', '`url`', '`latitude`', '`longitude`'],
							[`${data.id}`, `${data.name}`, `${data.description}`, `${data.url}`, `${data.latitude}`, `${data.longitude}`]
						);
						log.info(`Saved gym-details for ${data.name}`);
					}
				});
			}, { noAck: true });
		});
	});


	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((err, ch) => {
			const q = 'gym';

			ch.assertQueue(q, { durable: false });
			log.debug(`Reading ${q} bunnywabbit`);
			ch.consume(q, (msg) => {
				const data = JSON.parse(msg.content.toString());
				query.countQuery('id', 'gym-info', 'id', data.gym_id, (err, exists) => {
					if (exists) {
						query.updateQuery('gym-info', 'park', data.park, 'id', data.gym_id);
					}
					else log.warn('Cannot update Park before gym-details');
				});
			}, { noAck: true });
		});
	});

	amqp.connect(config.rabbit.conn, (err, conn) => {
		conn.createChannel((err, ch) => {
			const q = 'quest';

			ch.assertQueue(q, { durable: false });
			log.debug(`Reading ${q} bunnywabbit`);
			ch.consume(q, (msg) => {
				const data = JSON.parse(msg.content.toString());

				query.questWhoCares(data, (whocares) => {
					if (!Array.isArray(whocares)) log.error(`Unable to iterate query result ${whocares}`)
					if (whocares.length !== 0 && Array.isArray(whocares)) {
						gmaps.getAddress({
							lat: data.latitude,
							lon: data.longitude,
						}, (err, geoResult) => {

							data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`;
							data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`;
							data.tth = moment.preciseDiff(Date.now(), moment().endOf('day') * 1000, true);

							const view = {
								time: data.hatchtime,
								tthh: data.tth.hours,
								tthm: data.tth.minutes,
								tths: data.tth.seconds,
								name: data.name,
								quest: questData[data.quest_id].name,
								reward: rewardData[data.reward_id].name,
								staticmap: data.staticmap,
								mapurl: data.mapurl,
								applemap: data.applemap,
								// geocode stuff
								addr: geoResult.addr,
								streetNumber: geoResult.streetNumber,
								streetName: geoResult.streetName,
								zipcode: geoResult.zipcode,
								country: geoResult.country,
								countryCode: geoResult.countryCode,
								city: geoResult.city,
								state: geoResult.state,
								stateCode: geoResult.stateCode,
							};

							const template = JSON.stringify(dts.quest);
							let message = mustache.render(template, view);
							log.debug(message);
							message = JSON.parse(message);
							whocares.forEach((cares) => {
								sendDMAlarm(message, cares.id, [], cares.map_enabled);
								log.info(`Alerted ${cares.name} about quest:'${data.quest}' with reward: '${data.reward}' `);
							});
						});
					}
				});
			}, { noAck: true });
		});
	});

});

