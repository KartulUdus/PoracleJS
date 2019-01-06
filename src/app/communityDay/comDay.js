const ocr = require('./ocr')
const _ = require('lodash')
const log = require('../logger')
const { Client } = require('discord.js')
const config = require('config')

const client = new Client()
const mysql = require('promise-mysql2')

const db = mysql.createPool(config.db)
const Controller = require('../controllers/comDay')

const query = new Controller(db)
const moment = require('moment')

moment.locale(config.locale.timeformat)

const monsterData = require(config.locale.commandMonstersJson)


const now = new Date().toISOString().slice(0, 19).replace('T', ' ')

client.login(config.discord.token[0])
	.catch((err) => {
		log.error(`Discord unhappy: ${err.message}`)
	})

client.on('message', (msg) => {
	// handle messages with attachments
	const Attachment = (msg.attachments).array()[0]
	// const comDayController = new ComDayController
	if (Attachment) {

		query.findActiveComEvent().then((event) => {
			if (event && msg.channel.id === event.channel_id) {
				ocr.detect(Attachment.url).then((data) => {
					if (data.correctPokemon && data.seenCount.toString() && data.caughtCount.toString() && data.luckyCount.toString()) {
						query.insertQuery(
							'comsubmission',
							['discord_id', 'discord_name', 'submit_timestamp', 'monster_id', 'seen', 'caught', 'lucky'],
							[msg.author.id, msg.author.username, now, data.monster_id, data.seenCount, data.caughtCount, data.luckyCount]
						)
						msg.reply(`Thanks, I have submitted your ${monsterData[data.monster_id].name} seen:${data.seenCount} caught:${data.caughtCount} lucky:${data.luckyCount} `)
						log.info(msg.author.id, msg.author.username, new Date().getTime(), event.monster_id, data.seenCount, data.caughtCount, data.luckyCount)
					}
					else {
						msg.reply(`Couldn't match needed data \n eventmon detected:${data.correctPokemon}\n seen:${data.seenCount}\n caught:${data.caughtCount}\n lucky:${data.luckyCount}`)
					}
				})
			}
		})
	}


	if (msg.content.startsWith(`${config.discord.prefix}createevent `) && msg.member.roles.find(x => x.name === config.discord.modRole)) {
		const rawArgs = msg.content.slice(`${config.discord.prefix}createevent `.length).split(' ')
		const args = rawArgs.join('|').toLowerCase().split('|')
		let channelExists = false
		msg.guild.channels.array().forEach((channel) => {
			if (channel.name.toLowerCase() === args[0].toLowerCase()) channelExists = true
		})
		query.findActiveComEvent().then((event) => {
			if (event) {
				msg.reply('Sorry, there currenlty is a running event')
			}
			else {
				const monsters = []
				let duration = false
				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) monsters.push(pid)
					if (!Number.isNaN(element)) duration = element
				})

				if (duration && monsters[0] && !channelExists) {
					const endTime = moment(now).add(duration, 'hour').format().slice(0, 19)
						.replace('T', ' ')
					msg.guild.createChannel(args[0]).then(channel =>
						query.insertQuery(
							'comevent',
							['`creator_id`', '`creator_name`', '`channel_id`', '`end_timestamp`', '`create_timestamp`', '`monster_id`', '`finished`'],
							[`${msg.author.id}`, `${msg.author.username}`, `${channel.id}`, endTime, now, `${monsters}`, '0']
						))
				}
				else {
					msg.reply('Event not created. I either did not find a valid pokemon, duration in hours or the channel exists \n' +
						'Try again with `!createevent {channel name} {event duration in hours} {pokemon to look for}`')
				}
			}
		})
	}

	if (msg.content === `${config.discord.prefix}stopevent`) {
		if (msg.member.roles.find(x => x.name === config.discord.modRole)) {
			query.findActiveComEvent().then((event) => {
				if (!event) {
					msg.reply('No active event to cancel')
				}
				else {
					const monsters = event.monster_id.split(',')
					monsters.forEach((monster) => {
						query.getComEventResults(monster, event.create_timestamp).then((results) => {
							if (results) {
								let message = `:slight_smile: :slight_smile:  The event for ${monsterData[monsters[0]].name} was manually ended by <@${msg.author.id}> :slight_smile: :slight_smile: \n Here are the results: \n\n`
								results.forEach((result) => {
									message = message.concat(`${result.n}: <@${result.discord_id}> SEEN:${result.seen} CAUGHT:${result.caught} LUCKY:${result.lucky} \n`)
								})
								client.channels.get(config.discord.comDayResultChannelId).send(message, { split: true })
								query.updateQuery('comevent', 'finished', 1, 'monster_id', event.monster_id)
							}
							msg.reply(`${monsterData[event.monster_id].name} event cancelled`)
						})
					})
				}
			})
		}
	}
})


function endComEvent() {
	log.debug('checking for expired events')
	query.findExpiredComEvent().then((endedEvent) => {
		if (endedEvent) {
			const monsters = endedEvent.monster_id.split(',')
			monsters.forEach((monster) => {
				query.getComEventResults(monster, moment(endedEvent.create_timestamp).format().slice(0, 19).replace('T', ' ')).then((err, results) => {
					let message = `:tada::tada: The grind for ${monsterData[endedEvent.monster_id].name} has ended :tada::tada:\n Here are the results: \n\n`
					results.forEach((result) => {
						message = message.concat(`${result.n}: <@${result.discord_id}> SEEN:${result.seen} CAUGHT:${result.caught} LUCKY:${result.lucky} \n`)
					})
					log.debug(message)
					client.channels.get(config.discord.comDayResultChannelId).send(message, { split: true })
					query.updateQuery('comevent', 'finished', 1, 'monster_id', endedEvent.monster_id)
				})
			})
		}
	})

}

client.on('ready', () => {
	log.info('Community bot ready')
	setInterval(endComEvent, 300000)
})

