const ocr = require('./ocr');
const _ = require('lodash');
const log = require('../logger');
const client = require('../discord/client');
const query = require('../sql/queries');
const config = require('config');
const moment = require('moment');

const monsterData = require(config.locale.commandMonstersJson);


const now = new Date().toISOString().slice(0, 19).replace('T', ' ');


client.on('message', (msg) => {
	// handle messages with attachments
	const Attachment = (msg.attachments).array()[0];
	if (Attachment) {
		query.findActiveComEvent((err, event) => {
			if (event && msg.channel.id === event.channel_id) {
				ocr.detect(Attachment.url, (err, data) => {
					if (err) log.error(err);
					if (data.correctPokemon) {
						query.insertQuery(
							'comsubmission',
							['discord_id', 'discord_name', 'submit_timestamp', 'monster_id', 'seen', 'caught', 'lucky'],
							[msg.author.id, msg.author.username, now, event.monster_id, data.seenCount, data.caughtCount, data.luckyCount]
						);
						msg.reply(`Thanks, I have submitted your ${monsterData[event.monster_id].name} seen:${data.seenCount} caught:${data.caughtCount} lucky:${data.luckyCount} `);
						// log.info(data)
						log.info(msg.author.id, msg.author.username, new Date().getTime(), event.monster_id, data.seenCount, data.caughtCount, data.luckyCount);
					}
					else {
						msg.reply('Thre\'s currently no event for this monster, try again');
					}
				});
			}
		});
	}


	if (msg.content.startsWith(`${config.discord.prefix}createevent `) && msg.channel.id === config.discord.comDayChannelId) {
		const rawArgs = msg.content.slice(`${config.discord.prefix}createevent `.length).split(' ');
		const args = rawArgs.join('|').toLowerCase().split('|');
		let channelExists = false;
		msg.guild.channels.array().forEach((channel) => {
			if (channel.name.toLowerCase() === args[0].toLowerCase()) channelExists = true;
		});
		query.findActiveComEvent((err, event) => {
			if (event) {
				msg.reply('Sorry, there currenlty is a running event');
			}
			else {
				const monsters = [];
				let duration = false;
				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element);
					if (pid !== undefined) monsters.push(pid);
					if (!isNaN(element)) duration = element;
				});

				if (duration && monsters[0] && !channelExists) {
					const endTime = moment(now).add(duration, 'hour').format().slice(0, 19)
						.replace('T', ' ');
					msg.guild.createChannel(args[0]).then(channel =>
						query.insertQuery(
							'comevent',
							['`creator_id`', '`creator_name`', '`channel_id`', '`end_timestamp`', '`create_timestamp`', '`monster_id`', '`finished`'],
							[`${msg.author.id}`, `${msg.author.username}`, `${channel.id}`, endTime, now, `${monsters[0]}`, '0']
						));
				}
				else {
					msg.reply('Event not created. I either did not find a valid pokemon, duration in hours or the channel exists \n' +
						'Try again with `!createevent {channel name} {event duration in hours} {pokemon to look for}`');
				}
			}
		});
	}

	if (msg.content === `${config.discord.prefix}stopevent`){
		if(msg.member.roles.find(x => x.name === config.discord.modRole)){
			query.findActiveComEvent((err, event)=>{
				if(!event){
					msg.reply('No active event to cancel')
				} else {
					query.getComEventResults(event.monster_id, event.create_timestamp, (err, results)=>{
						if(results[0]){
							let message = `:) :) The event for ${monsterData[event.monster_id].name} was manually ended by <@${msg.author.id}> :) :):\n Here are the results: \n\n`;
							results.forEach((result) => {
								message = message.concat(`${result.n}: <@${result.discord_id}> SEEN:${result.seen} CAUGHT:${result.caught} LUCKY:${result.lucky} \n`);
							});
							client.channels.get(config.discord.comDayResultChannelId).send(message, { split: true });
							query.updateQuery('comevent', 'finished', 1, 'monster_id', event.monster_id);
						}

						msg.reply(`${monsterData[event.monster_id].name} event cancelled`)
					})
				}
			})
		}
	}
});


client.on('ready', () => {
	setInterval(endComEvent, 300000);
});

function endComEvent() {
	log.debug('checking for expired events');
	query.findExpiredComEvent((err, endedEvent) => {
		if (err) log.error(err);
		if (endedEvent) {
			query.getComEventResults(endedEvent.monster_id, moment(endedEvent.create_timestamp).format().slice(0, 19).replace('T', ' '), (err, results) => {
				let message = `:tada::tada: The grind for ${monsterData[endedEvent.monster_id].name} has ended :tada::tada:\n Here are the results: \n\n`;
				results.forEach((result) => {
					message = message.concat(`${result.n}: <@${result.discord_id}> SEEN:${result.seen} CAUGHT:${result.caught} LUCKY:${result.lucky} \n`);
				});
				log.debug(message);
				client.channels.get(config.discord.comDayResultChannelId).send(message, { split: true });
				query.updateQuery('comevent', 'finished', 1, 'monster_id', endedEvent.monster_id);
			});

		}
	});

}

