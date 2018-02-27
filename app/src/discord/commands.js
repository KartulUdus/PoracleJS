const client = require('./client');
const config = require('config');

const log = require('../logger');
const query = require('../sql/queries');
const gmaps = require('../geo/google');

const monsterData = require(config.locale.commandMonstersJson);
const teamData = require('../util/teams');
const formData = require('../util/forms');
const _ = require('lodash');
const hastebin = require('hastebin-gen');
const dts = require('../../../config/dts');


// Register command
client.on('message', (msg) => {
	if (msg.content === `${config.discord.prefix}poracle`) {
		if (msg.channel.name === config.discord.channel) {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) msg.react('👌');
				if (isregistered === 0) {
					query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [`'${msg.author.id}'`, `'${msg.author.username}'`, '\'[]\'']);
					msg.react('✅');
					msg.author.send(dts.greeting);
					log.info(`${msg.author.username} registered`);
				}
			});

		}
		else {
			log.info(`${msg.author.username} tried to register in ${msg.channel.name}`);
			msg.react('🙅');
		}
	}

	// Unregister command

	else if (msg.content === `${config.discord.prefix}unregister`) {
		query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
			if (isregistered === 0) msg.react('👌');
			if (isregistered === 1) {
				query.deleteQuery('egg', 'id', msg.author.id);
				query.deleteQuery('monsters', 'id', msg.author.id);
				query.deleteQuery('raid', 'id', msg.author.id);
				query.deleteQuery('humans', 'id', msg.author.id);
				msg.react('✅');
				log.info(`${msg.author.username} unregistered`);
			}
		});
	}

	// admin unregister someone

	else if (msg.content.startsWith(`${config.discord.prefix}unregister `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1) {
			const target = msg.mentions.users.first();
			if (target !== undefined) {
				query.countQuery('id', 'humans', 'id', target.id, (err, isregistered) => {
					if (isregistered === 0) msg.react('👌');
					if (isregistered === 1) {
						query.deleteQuery('egg', 'id', target.id);
						query.deleteQuery('monsters', 'id', target.id);
						query.deleteQuery('raid', 'id', target.id);
						query.deleteQuery('humans', 'id', target.id);
						msg.react('✅');
						log.info(`${msg.author.username} unregistered`);

					}
				});
			}
		}
	}

	// location command

	else if (msg.content.startsWith(`${config.discord.prefix}location `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const search = msg.content.split('location ').pop();
					gmaps.geolocate(search, (err, location) => {
						if (err) {
							log.error(err);
							msg.reply('I was Unable to fetch location data ☹️');
						}
						else if (location[0] !== undefined) {
							query.updateLocation('humans', location[0].latitude, location[0].longitude, 'id', msg.author.id);
							const maplink = `https://www.google.com/maps/search/?api=1&query=${location[0].latitude},${location[0].longitude}`;
							msg.author.send(`:wave:, I set your location to : \n${maplink}`);
							msg.react('✅');
						}
						else msg.reply('I was Unable to fetch location data ☹️');
					});

				}
				else msg.react('🙅');
			});
		}
		else msg.react('🙅');
	}

	// Add Channel command

	else if (msg.content === `${config.discord.prefix}channel add`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) msg.react('👌');
				if (isregistered === 0) {
					query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [`'${msg.channel.id}'`, `'${msg.channel.name}'`, '\'[]\'']);
					msg.react('✅');
					msg.reply(`${msg.channel.name} has been registered`);
					log.info(`${msg.author.username} registered ${msg.channel.name}`);
				}
			});

		}
		else {
			log.info(`${msg.author.username} tried to register ${msg.channel.name}`);
			msg.react('🙅');
		}
	}

	// Remove Channel command

	else if (msg.content === `${config.discord.prefix}channel remove`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 0) msg.react('👌');
				if (isregistered === 1) {
					query.deleteQuery('egg', 'id', msg.channel.id);
					query.deleteQuery('monsters', 'id', msg.channel.id);
					query.deleteQuery('raid', 'id', msg.channel.id);
					query.deleteQuery('humans', 'id', msg.channel.id);
					msg.react('✅');
					log.info(`${msg.author.username} unregistered ${msg.channel.name}`);
				}
			});
		}
	}

	// Channel location command

	else if (msg.content.startsWith(`${config.discord.prefix}channel location `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const search = msg.content.split(`${config.discord.prefix}channel location `).pop();
					gmaps.geolocate(search, (err, location) => {
						if (err) {
							log.error(err);
							msg.reply('I was Unable to fetch location data ☹️');
						}
						else if (location[0] !== undefined) {
							query.updateLocation('humans', location[0].latitude, location[0].longitude, 'id', msg.channel.id);
							const maplink = `https://www.google.com/maps/search/?api=1&query=${location[0].latitude},${location[0].longitude}`;
							msg.reply(`I set ${msg.channel.name} to: \n${maplink}`);
							msg.react('✅');
						}
						else msg.reply('I was Unable to fetch location data ☹️');
					});

				}
				else msg.react('🙅');
			});
		}
		else msg.react('🙅');
	}

	// start

	else if (msg.content === `${config.discord.prefix}start`) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'enabled', true, 'id', msg.author.id);
					msg.react('✅');
					log.debug(`${msg.author.username} enabled alarms`);
				}
				else msg.react('🙅');
			});
		}
	}

	// stop

	else if (msg.content === `${config.discord.prefix}stop`) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'enabled', false, 'id', msg.author.id);
					msg.react('✅');
					log.debug(`${msg.author.username} disabled alarms`);
				}
				else msg.react('🙅');
			});
		}
	}

	// turn map on

	else if (msg.content === `${config.discord.prefix}map enable`) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'map_enabled', true, 'id', msg.author.id);
					msg.react('✅');
					log.debug(`${msg.author.username} enabled alarms`);
				}
				else msg.react('🙅');
			});
		}
	}

	// turn map off

	else if (msg.content === `${config.discord.prefix}map disable`) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'map_enabled', false, 'id', msg.author.id);
					msg.react('✅');
					log.debug(`${msg.author.username} disabled alarms`);
				}
				else msg.react('🙅');
			});
		}
	}

	// channel alarms on
	else if (msg.content === `${config.discord.prefix}channel start`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'enabled', true, 'id', msg.channel.id);
					msg.react('✅');
					log.debug(`${msg.author.username} enabled alarms in ${msg.channel.name}`);
				}
				else msg.react('🙅');
			});
		}
		else msg.react('🙅');
	}

	// channel alarms off
	else if (msg.content === `${config.discord.prefix}channel stop`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'enabled', false, 'id', msg.channel.id);
					msg.react('✅');
					log.debug(`${msg.author.username} disabled alarms in ${msg.channel.name}`);
				}
				else msg.react('🙅');
			});
		}
		else msg.react('🙅');
	}

	// channel map on
	else if (msg.content === `${config.discord.prefix}channel map enable`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'map_enabled', true, 'id', msg.channel.id);
					msg.react('✅');
					log.debug(`${msg.author.username} enabled alarms in ${msg.channel.name}`);
				}
				else msg.react('🙅');
			});
		}
		else msg.react('🙅');
	}

	// channel map off
	else if (msg.content === `${config.discord.prefix}channel map disable`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.updateQuery('humans', 'map_enabled', false, 'id', msg.channel.id);
					msg.react('✅');
					log.debug(`${msg.author.username} enabled alarms in ${msg.channel.name}`);
				}
				else msg.react('🙅');
			});
		}
		else msg.react('🙅');
	}

	// add area

	else if (msg.content.startsWith(`${config.discord.prefix}area add `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}area add`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const confAreas = config.geofence.map(area => area.name.toLowerCase());
					query.selectOneQuery('humans', 'id', msg.author.id, (err, human) => {
						const oldArea = JSON.parse(human.area.split());
						const validAreas = confAreas.filter(x => args.includes(x));
						const addAreas = validAreas.filter(x => !oldArea.includes(x));
						let newAreas = oldArea.concat(addAreas);
						newAreas = newAreas.filter(n => n);
						if (addAreas.length !== 0) {
							query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.author.id);
						}
						if (validAreas.length !== 0) {
							if (addAreas.length !== 0) {
								msg.reply(`Added areas: ${addAreas}`);
								log.info(`${msg.author.username} added areas ${addAreas}`);
							}
							else msg.react('👌');
						}
						else msg.reply(`no valid areas there, please use one of ${confAreas}`);

					});
				}
				else msg.react('🙅');
			});
		}
	}

	// remove area

	else if (msg.content.startsWith(`${config.discord.prefix}area remove `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}area remove`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const confAreas = config.geofence.map(area => area.name.toLowerCase());
					query.selectOneQuery('humans', 'id', msg.author.id, (err, human) => {
						const oldArea = JSON.parse(human.area.split());
						const validAreas = oldArea.filter(x => args.includes(x));
						const removeAreas = validAreas.filter(x => oldArea.includes(x));
						const newAreas = oldArea.filter(x => !removeAreas.includes(x));
						if (removeAreas.length !== 0) {
							query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.author.id);
						}
						if (validAreas.length !== 0) {
							if (removeAreas.length !== 0) {
								msg.reply(`Removed areas: ${removeAreas}`);
								log.info(`${msg.author.username} removed areas ${removeAreas}`);
							}
							else msg.react('👌');
						}
						else msg.reply(`404 NO VALID AND TRACKED AREAS FOUND \n VALID: ${confAreas} \n TRACKED: ${oldArea}`);
					});
				}
				else msg.react('🙅');
			});
		}
	}

	// channel area add

	else if (msg.content.startsWith(`${config.discord.prefix}channel area add `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel area add`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const confAreas = config.geofence.map(area => area.name.toLowerCase());
					query.selectOneQuery('humans', 'id', msg.channel.id, (err, channel) => {
						const oldArea = JSON.parse(channel.area.split());
						const validAreas = confAreas.filter(x => args.includes(x));
						const addAreas = validAreas.filter(x => !oldArea.includes(x));
						let newAreas = oldArea.concat(addAreas);
						newAreas = newAreas.filter(n => n);
						if (addAreas.length !== 0) {
							query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.channel.id);
						}
						if (validAreas.length !== 0) {
							if (addAreas.length !== 0) {
								msg.reply(`Added areas: ${addAreas}`);
								log.info(`${msg.author.username} added areas ${addAreas} to ${msg.channel.name}`);
							}
							else msg.react('👌');
						}
						else msg.reply(`no valid areas there, please use one of ${confAreas}`);

					});
				}
				else msg.react('🙅');
			});
		}
	}

	// channel area remove

	else if (msg.content.startsWith(`${config.discord.prefix}channel area remove `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel area remove`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const confAreas = config.geofence.map(area => area.name.toLowerCase());
					query.selectOneQuery('humans', 'id', msg.channel.id, (err, channel) => {
						const oldArea = JSON.parse(channel.area.split());
						const validAreas = oldArea.filter(x => args.includes(x));
						const removeAreas = validAreas.filter(x => oldArea.includes(x));
						const newAreas = oldArea.filter(x => !removeAreas.includes(x));
						if (removeAreas.length !== 0) {
							query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.channel.id);
						}
						if (validAreas.length !== 0) {
							if (removeAreas.length !== 0) {
								msg.reply(`Removed areas: ${removeAreas}`);
								log.info(`${msg.author.username} removed areas ${removeAreas} from ${msg.channel.name}`);
							}
							else msg.react('👌');
						}
						else msg.reply(`404 NO VALID AND TRACKED AREAS FOUND \n VALID: ${confAreas} \n TRACKED: ${oldArea}`);
					});
				}
				else msg.react('🙅');
			});
		}
	}

	// Track dm monsters

	else if (msg.content.startsWith(`${config.discord.prefix}track `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}track`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let monsters = [];
					let distance = 0;
					let cp = 0;
					let maxcp = 9000;
					let iv = -1;
					let maxiv = 100;
					let level = 0;
					let maxlevel = 40;
					let atk = 0;
					let def = 0;
					let sta = 0;
					let weight = 0;
					let maxweight = 9000000;
					const forms = [];

					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
					});
					args.forEach((element) => {

						if (element.match(/maxlevel\d/gi)) {
							maxlevel = element.replace(/maxlevel/gi, '');
						}
						else if (element.match(/maxcp\d/gi)) {
							maxcp = element.replace(/maxcp/gi, '');
						}
						else if (element.match(/maxiv\d/gi)) {
							maxiv = element.replace(/maxiv/gi, '');
						}
						else if (element.match(/maxweight\d/gi)) {
							maxweight = element.replace(/maxweight/gi, '');
						}
						else if (element.match(/cp\d/gi)) {
							cp = element.replace(/cp/gi, '');
						}
						else if (element.match(/level\d/gi)) {
							level = element.replace(/level/gi, '');
						}
						else if (element.match(/iv\d/gi)) {
							iv = element.replace(/iv/gi, '');
						}
						else if (element.match(/d\d/gi)) {
							distance = element.replace(/d/gi, '');
						}
						else if (element.match(/atk\d/gi)) {
							atk = element.replace(/atk/gi, '');
						}
						else if (element.match(/def\d/gi)) {
							def = element.replace(/def/gi, '');
						}
						else if (element.match(/sta\d/gi)) {
							sta = element.replace(/sta/gi, '');
						}
						else if (element.match(/weight\d/gi)) {
							weight = element.replace(/weight/gi, '');
						}
						else if (element.match(/form\w/gi)) {
							forms.push(element.replace(/form/gi, ''));
						}
						else if (element.match(/everything/gi)) {
							monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1);
						}

					});

					if (monsters.length !== 0 && forms.length === 0) {
						const form = 0;
						monsters.forEach((monster) => {
							query.insertOrUpdateQuery(
								'monsters',
								['id', 'pokemon_id', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
								[`'${msg.author.id}'`, `'${monster}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
							);
						});
						msg.react('✅');
						log.info(`${msg.author.username} started tracking ${monsters}`);

					}
					else if (monsters.length > 1 && forms.length !== 0) {
						msg.reply('Form filters can be added to 1 monster at a time');
					}
					else if (monsters.length === 0) {
						msg.reply('404 NO MONSTERS FOUND');
					}
					else if (monsters.length === 1 && forms.length !== 0) {
						if (_.has(formData, monsters[0])) {
							const fids = [];
							forms.forEach((form) => {
								const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form);
								if (fid !== undefined) fids.push(fid);
							});
							fids.forEach((form) => {
								query.insertOrUpdateQuery(
									'monsters',
									['id', 'pokemon_id', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
									[`'${msg.author.id}'`, `'${monsters[0]}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
								);

							});
							if (fids.length > 0) {
								msg.react('✅');
								log.info(`${msg.author.username} started tracking ${monsters[0]}, forms ${fids}`);
							}
							else {
								msg.reply(`Sorry, I didn't find those forms for ID ${monsters[0]}`);
							}

						}
						else {
							msg.reply(`Sorry, ${monsters[0]} doesn't have forms`);
						}
					}
				}
				else msg.react('🙅');
			});
		}
	}

	// untrack monster

	else if (msg.content.startsWith(`${config.discord.prefix}untrack `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}untrack`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let monsters = [];
					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
						if (element.match(/everything/gi)) {
							monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1);
						}
					});

					if (monsters.length !== 0) {
						monsters.forEach((monster) => {
							query.deleteMonsterQuery('monsters', 'pokemon_id', `${monster}`, msg.author.id);
						});
						msg.react('✅');
					}
					else msg.reply('404 NO MONSTERS FOUND');
				}
				else msg.react('🙅');
			});
		}
	}

	// channel track

	else if (msg.content.startsWith(`${config.discord.prefix}channel track `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel track`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let monsters = [];
					let distance = 0;
					let cp = 0;
					let maxcp = 9000;
					let iv = -1;
					let maxiv = 100;
					let level = 0;
					let maxlevel = 40;
					let atk = 0;
					let def = 0;
					let sta = 0;
					let weight = 0;
					let maxweight = 9000000;
					const forms = [];

					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
					});
					args.forEach((element) => {

						if (element.match(/maxlevel\d/gi)) {
							maxlevel = element.replace(/maxlevel/gi, '');
						}
						else if (element.match(/maxcp\d/gi)) {
							maxcp = element.replace(/maxcp/gi, '');
						}
						else if (element.match(/maxiv\d/gi)) {
							maxiv = element.replace(/maxiv/gi, '');
						}
						else if (element.match(/maxweight\d/gi)) {
							maxweight = element.replace(/maxweight/gi, '');
						}
						else if (element.match(/cp\d/gi)) {
							cp = element.replace(/cp/gi, '');
						}
						else if (element.match(/level\d/gi)) {
							level = element.replace(/level/gi, '');
						}
						else if (element.match(/iv\d/gi)) {
							iv = element.replace(/iv/gi, '');
						}
						else if (element.match(/d\d/gi)) {
							distance = element.replace(/d/gi, '');
						}
						else if (element.match(/atk\d/gi)) {
							atk = element.replace(/atk/gi, '');
						}
						else if (element.match(/def\d/gi)) {
							def = element.replace(/def/gi, '');
						}
						else if (element.match(/sta\d/gi)) {
							sta = element.replace(/sta/gi, '');
						}
						else if (element.match(/weight\d/gi)) {
							weight = element.replace(/weight/gi, '');
						}
						else if (element.match(/form\w/gi)) {
							forms.push(element.replace(/form/gi, ''));
						}
						else if (element.match(/everything/gi)) {
							monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1);
						}

					});

					if (monsters.length !== 0 && forms.length === 0) {
						const form = 0;
						monsters.forEach((monster) => {
							query.insertOrUpdateQuery(
								'monsters',
								['id', 'pokemon_id', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
								[`'${msg.channel.id}'`, `'${monster}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
							);
						});
						msg.react('✅');
						log.info(`${msg.author.username} started tracking ${monsters} in ${msg.channel.name}`);

					}
					else if (monsters.length > 1 && forms.length !== 0) {
						msg.reply('Form filters can be added to 1 monster at a time');
					}
					else if (monsters.length === 0) {
						msg.reply('404 NO MONSTERS FOUND');
					}
					else if (monsters.length === 1 && forms.length !== 0) {
						if (_.has(formData, monsters[0])) {
							const fids = [];
							forms.forEach((form) => {
								const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form);
								if (fid !== undefined) fids.push(fid);
							});
							fids.forEach((form) => {
								query.insertOrUpdateQuery(
									'monsters',
									['id', 'pokemon_id', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
									[`'${msg.channel.id}'`, `'${monsters[0]}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
								);

							});
							if (fids.length > 0) {
								msg.react('✅');
								log.info(`${msg.author.username} started tracking ${monsters[0]}, forms ${fids} in ${msg.channel.name}`);
							}
							else {
								msg.reply(`Sorry, I didn't find those forms for ID ${monsters[0]}`);
							}

						}
						else {
							msg.reply(`Sorry, ${monsters[0]} doesn't have forms`);
						}
					}
				}
				else msg.react('🙅');
			});
		}
	}


	else if (msg.content.startsWith(`${config.discord.prefix}channel untrack `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel untrack`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let monsters = [];
					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
						if (element.match(/everything/gi)) {
							monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1);
						}
					});
					if (monsters.length !== 0) {
						monsters.forEach((monster) => {
							query.deleteMonsterQuery('monsters', 'pokemon_id', `${monster}`, msg.channel.id);
						});
						msg.react('✅');
					}
					else msg.reply('404 NO MONSTERS FOUND');
				}
				else msg.react('🙅');
			});
		}
	}


	// raid tracking
	else if (msg.content.startsWith(`${config.discord.prefix}raid `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}track`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const monsters = [];
					let park = 0;
					let distance = 0;
					let team = 4;
					const levels = [];

					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
					});
					args.forEach((element) => {
						if (element.match(/park/gi)) {
							park = 1;
						}
						else if (element.match(/d\d/gi)) {
							distance = element.replace(/d/gi, '');
						}
						else if (element.match(/level\d/gi)) {
							levels.push(element.replace(/level/gi, ''));
						}
						else if (element.match(/instinct/gi)) {
							team = 3;
						}
						else if (element.match(/valor/gi)) {
							team = 2;
						}
						else if (element.match(/mystic/gi)) {
							team = 1;
						}
						else if (element.match(/harmony/gi)) {
							team = 0;
						}

					});

					if (monsters.length !== 0 && levels.length === 0) {
						const level = 0;
						monsters.forEach((monster) => {
							query.insertOrUpdateQuery(
								'raid',
								['id', 'pokemon_id', 'distance', 'park', 'team', 'level'],
								[`'${msg.author.id}'`, `'${monster}'`, `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
							);
						});
						msg.react('✅');
						log.info(`${msg.author.username} started tracking ${monsters}`);

					}
					else if (monsters.length === 0 && levels.length === 0) msg.reply('404 NO MONSTERS FOUND');
					else if (monsters.length !== 0 && levels.length !== 0) msg.reply('400 Can\'t track raids by name and level at the same time');
					else if (monsters.length === 0 && levels.length !== 0) {
						levels.forEach((level) => {
							query.insertOrUpdateQuery(
								'raid',
								['id', 'pokemon_id', 'distance', 'park', 'team', 'level'],
								[`'${msg.author.id}'`, '\'721\'', `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
							);
						});
						msg.react('✅');
						log.info(`${msg.author.username} started tracking raid levels${levels}`);
					}
				}
				else msg.react('🙅');
			});
		}
	}

	// raid removal

	else if (msg.content.startsWith(`${config.discord.prefix}unraid `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}unraid`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const monsters = [];
					const levels = [];
					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
						if (element.match(/level\d/gi)) {
							levels.push(element.replace(/level/gi, ''));
						}

					});
					if (monsters.length !== 0) {
						monsters.forEach((monster) => {
							query.deleteMonsterQuery('raid', 'pokemon_id', `${monster}`, msg.author.id);
						});
						msg.react('✅');
					}
					if (levels.length !== 0) {
						levels.forEach((level) => {
							query.deleteMonsterQuery('raid', 'level', `${level}`, msg.author.id);
						});
						msg.react('✅');
					}
					if (monsters.length === 0 && levels.length === 0) msg.reply('404 No raid bosses or levels found');
				}
				else msg.react('🙅');
			});
		}
	}


	// channel raid tracking
	else if (msg.content.startsWith(`${config.discord.prefix}channel raid `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel raid`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const monsters = [];
					let park = 0;
					let distance = 0;
					let team = 4;
					const levels = [];

					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
					});
					args.forEach((element) => {
						if (element.match(/park/gi)) {
							park = 1;
						}
						else if (element.match(/d\d/gi)) {
							distance = element.replace(/d/gi, '');
						}
						else if (element.match(/level\d/gi)) {
							levels.push(element.replace(/level/gi, ''));
						}
						else if (element.match(/instinct/gi)) {
							team = 3;
						}
						else if (element.match(/valor/gi)) {
							team = 2;
						}
						else if (element.match(/mystic/gi)) {
							team = 1;
						}
						else if (element.match(/harmony/gi)) {
							team = 0;
						}

					});

					if (monsters.length !== 0 && levels.length === 0) {
						const level = 0;
						monsters.forEach((monster) => {
							query.insertOrUpdateQuery(
								'raid',
								['id', 'pokemon_id', 'distance', 'park', 'team', 'level'],
								[`'${msg.channel.id}'`, `'${monster}'`, `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
							);
						});
						msg.react('✅');
						log.info(`${msg.author.username} started tracking ${monsters} in ${msg.channel.name}`);

					}
					else if (monsters.length === 0 && levels.length === 0) msg.reply('404 NO MONSTERS FOUND');
					else if (monsters.length !== 0 && levels.length !== 0) msg.reply('400 Can\'t track raids by name and level at the same time');
					else if (monsters.length === 0 && levels.length !== 0) {
						levels.forEach((level) => {
							query.insertOrUpdateQuery(
								'raid',
								['id', 'pokemon_id', 'distance', 'park', 'team', 'level'],
								[`'${msg.channel.id}'`, '\'721\'', `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
							);
						});
						msg.react('✅');
						log.info(`${msg.author.username} started tracking raid levels:${levels} raids in ${msg.channel.name} `);
					}

				}
				else msg.react('🙅');
			});
		}
	}

	// channel raid removal

	else if (msg.content.startsWith(`${config.discord.prefix}channel unraid`)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel unraid`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					const monsters = [];
					const levels = [];
					args.forEach((element) => {
						const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
						if (pid !== undefined) monsters.push(pid);
						if (element.match(/level\d/gi)) {
							levels.push(element.replace(/level/gi, ''));
						}
					});
					if (monsters.length !== 0) {
						monsters.forEach((monster) => {
							query.deleteMonsterQuery('raid', 'pokemon_id', `${monster}`, msg.channel.id);
						});
						msg.react('✅');
					}
					if (levels.length !== 0) {
						levels.forEach((level) => {
							query.deleteMonsterQuery('raid', 'level', `${level}`, msg.channel.id);
						});
						msg.react('✅');
					}
					if (monsters.length === 0 && levels.length === 0) msg.reply('404 No raid bosses or levels found');
				}
				else msg.react('🙅');
			});
		}
	}

	// egg tracking
	else if (msg.content.startsWith(`${config.discord.prefix}egg `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}egg`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let park = 0;
					let distance = 0;
					let level = 0;
					let team = 4;

					args.forEach((element) => {
						if (element.match(/park/gi)) {
							park = 1;
						}
						else if (element.match(/d\d/gi)) {
							distance = element.replace(/d/gi, '');
						}
						else if (element.match(/level\d/gi)) {
							level = element.replace(/level/gi, '');
						}
						else if (element.match(/instinct/gi)) {
							team = 3;
						}
						else if (element.match(/valor/gi)) {
							team = 2;
						}
						else if (element.match(/mystic/gi)) {
							team = 1;
						}
						else if (element.match(/harmony/gi)) {
							team = 0;
						}

					});

					if (level !== 0) {

						query.insertOrUpdateQuery(
							'egg',
							['id', 'raid_level', 'distance', 'park', 'team'],
							[`'${msg.author.id}'`, `'${level}'`, `'${distance}'`, `'${park}'`, `'${team}'`]
						);
						msg.react('✅');
						log.info(`${msg.author.username} started tracking level${level} raid eggs`);

					}
					else msg.reply('404 NO LEVELS FOUND');
				}
				else msg.react('🙅');
			});
		}
	}

	// egg removal

	else if (msg.content.startsWith(`${config.discord.prefix}unegg `)) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}unegg`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let level = 0;

					args.forEach((element) => {
						if (element.match(/level/gi)) {
							level = element.replace(/level/gi, '');
						}
					});

					if (level !== 0) {

						query.deleteMonsterQuery('egg', 'raid_level', `${level}`, msg.author.id);

						msg.react('✅');
					}
					else msg.reply('404 NO MONSTERS FOUND');
				}
				else msg.react('🙅');
			});
		}
	}


	// channel egg tracking
	else if (msg.content.startsWith(`${config.discord.prefix}channel egg `)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel egg`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');
					let park = 0;
					let level = 0;
					let distance = 0;
					let team = 4;
					args.forEach((element) => {
						if (element.match(/park/gi)) {
							park = 1;
						}
						else if (element.match(/d\d/gi)) {
							distance = element.replace(/d/gi, '');
						}
						else if (element.match(/level\d/gi)) {
							level = element.replace(/level/gi, '');
						}
						else if (element.match(/instinct/gi)) {
							team = 3;
						}
						else if (element.match(/valor/gi)) {
							team = 2;
						}
						else if (element.match(/mystic/gi)) {
							team = 1;
						}
						else if (element.match(/harmony/gi)) {
							team = 0;
						}
					});
					if (level !== 0) {

						query.insertOrUpdateQuery(
							'egg',
							['id', 'raid_level', 'distance', 'park', 'team'],
							[`'${msg.channel.id}'`, `'${level}'`, `'${distance}'`, `'${park}'`, `'${team}'`]
						);

						msg.react('✅');
						log.info(`${msg.author.username} started tracking level${level} eggs`);

					}
					else msg.reply('404 NO MONSTERS FOUND');
				}
				else msg.react('🙅');
			});
		}
	}

	// channel egg removal

	else if (msg.content.startsWith(`${config.discord.prefix}channel unegg`)) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					const rawArgs = msg.content.slice(`${config.discord.prefix}channel unegg`.length).split(' ');
					const args = rawArgs.join('|').toLowerCase().split('|');

					let level = 0;
					args.forEach((element) => {
						if (element.match(/level/gi)) {
							level = element.replace(/level/gi, '');
						}
						if (level !== 0) {
							query.deleteMonsterQuery('egg', 'raid_level', `${level}`, msg.channel.id);
							msg.react('✅');
						}
						else msg.reply('404 NO MONSTERS FOUND');
					});
				}
			});
		}
	}

	// DM tracked
	else if (msg.content === `${config.discord.prefix}tracked`) {
		if (msg.channel.type === 'dm') {
			query.countQuery('id', 'humans', 'id', msg.author.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.selectAllQuery('monsters', 'id', msg.author.id, (err, monsters) => {
						query.selectAllQuery('raid', 'id', msg.author.id, (err, raids) => {
							query.selectAllQuery('egg', 'id', msg.author.id, (err, eggs) => {
								query.selectOneQuery('humans', 'id', msg.author.id, (err, human) => {

									const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`;
									msg.reply(`👋\nYour location is currently set to ${maplink} \nand you currently are set to receive alarms in ${human.area}`);
									let message = '';
									if (monsters.length !== 0) {
										message = message.concat('\n\nYou\'re  tracking the following monsters:\n');
									}
									else message = message.concat('\n\nYou\'re not tracking any monsters');

									monsters.forEach((monster) => {
										const monsterName = monsterData[monster.pokemon_id].name;
										let miniv = monster.min_iv;
										if (miniv === -1) miniv = 0;
										message = message.concat(`\n**${monsterName}** distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} minimum stats: ATK:${monster.atk} DEF:${monster.def} STA:${monster.sta}`);
									});
									if (raids.length !== 0 || eggs.length !== 0) {
										message = message.concat('\n\nYou\'re tracking the following raids:\n');
									}
									else message = message.concat('\n\nYou\'re not tracking any raids');
									raids.forEach((raid) => {
										const monsterName = monsterData[raid.pokemon_id].name;
										const raidTeam = teamData[raid.team].name;
										message = message.concat(`\n**${monsterName}** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`);

									});
									eggs.forEach((egg) => {
										const raidTeam = teamData[egg.team].name;
										message = message.concat(`\n**Level ${egg.raid_level} eggs** distance: ${egg.distance}m controlled by ${raidTeam} , must be in park: ${egg.park}`);

									});

									if (message.length < 6000) {
										msg.reply(message, { split: true });
									}
									else {
										const hastebinMessage = hastebin(message);
										hastebinMessage.then((hastelink) => {
											msg.reply(`${msg.channel.name} tracking list is quite long. Have a look at ${hastelink}`);
										})
											.catch((err) => {
												log.error(`Hastebin unhappy: ${err}`);
												msg.reply(`${msg.channel.name} tracking list is long, but Hastebin is also down. ☹️ \nPlease try again later.`);

											});
									}
								});
							});
						});
					});
				}
				else msg.react('🙅');
			});
		}
	}


	// channel tracked
	else if (msg.content === `${config.discord.prefix}channel tracked`) {
		if (config.discord.admins.indexOf(msg.author.id) > -1 && msg.channel.type === 'text') {
			query.countQuery('id', 'humans', 'id', msg.channel.id, (err, isregistered) => {
				if (isregistered === 1) {
					query.selectAllQuery('monsters', 'id', msg.channel.id, (err, monsters) => {
						query.selectAllQuery('raid', 'id', msg.channel.id, (err, raids) => {
							query.selectAllQuery('egg', 'id', msg.channel.id, (err, eggs) => {
								query.selectOneQuery('humans', 'id', msg.channel.id, (err, human) => {

									const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`;
									msg.reply(`👋 \n${msg.channel.name} location is currently set to ${maplink} \nand you currently are set to receive alarms in ${human.area}`);
									let message = '';
									if (monsters.length !== 0) {
										message = message.concat(`\n\n${msg.channel.name} is tracking the following monsters:\n`);
									}
									else message = message.concat(`\n\n${msg.channel.name} is not tracking any monsters`);

									monsters.forEach((monster) => {
										const monsterName = monsterData[monster.pokemon_id].name;
										let miniv = monster.min_iv;
										if (miniv === -1) miniv = 0;
										message = message.concat(`\n**${monsterName}** distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} minimum stats: ATK:${monster.atk} DEF:${monster.def} STA:${monster.sta}`);
									});
									if (raids.length !== 0 || eggs.length !== 0) {
										message = message.concat(`\n\n${msg.channel.name} is tracking the following raids:\n`);
									}
									else message = message.concat(`\n\n${msg.channel.name} is not tracking any raids`);
									raids.forEach((raid) => {
										const monsterName = monsterData[raid.pokemon_id].name;
										const raidTeam = teamData[raid.team].name;
										message = message.concat(`\n**${monsterName}** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`);

									});
									eggs.forEach((egg) => {
										const raidTeam = teamData[egg.team].name;
										message = message.concat(`\n**Level ${egg.raid_level} eggs** distance: ${egg.distance}m controlled by ${raidTeam} , must be in park: ${egg.park}`);

									});
									if (message.length < 6000) {
										msg.reply(message, { split: true });
									}
									else {
										const hastebinMessage = hastebin(message);
										hastebinMessage.then((hastelink) => {
											msg.reply(`your tracking list is quite long. Have a look at ${hastelink}`);
										})
											.catch((err) => {
												log.error(`Hastebin unhappy: ${err}`);
												msg.reply(`${msg.channel.name} tracking list is long, but Hastebin is also down. ☹️\nPlease try again later.`);

											});
									}
								});
							});
						});
					});
				}
				else msg.react('🙅');
			});
		}
	}

});

