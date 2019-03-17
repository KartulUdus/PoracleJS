const _ = require('lodash')
const config = require('config')

let monsterDataPath = `${__dirname}/../../../util/monsters.json`
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = `${__dirname}/../../../util/locale/monsters${config.locale.language.toLowerCase()}.json`
}
const monsterData = require(monsterDataPath)
const questDts = require('../../../../config/questdts')

const typeData = require(`${__dirname}/../../../util/types`)


exports.run = (client, msg) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		return msg.author.send('Please run commands in Direct Messages').catch((O_o) => {
			client.log.error(O_o.message)
		})
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) target = { id: msg.content.match(client.hookRegex), name: `Webhook-${_.random(99999)}` }

	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) {
				return msg.reply(`${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}webhook add <YourWebhook>`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
				return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && msg.channel.type === 'dm') {
				return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}poracle to #${client.config.discord.channel}`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (isregistered) {
				let monsters = []
				const items = []
				let distance = 0
				const questTracks = []
				let template = 3
				let mustShiny = 0
				let remove = false
				const rawArgs = msg.content.slice(`${config.discord.prefix}quest`.length)
				const args = rawArgs.toLowerCase().split(' ')
				let minDust = 10000000
				let stardustTracking = 9999999

				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) monsters.push(pid)
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							} return k
						})
					}
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}
					else if (element.match(/stardust\d/gi)) minDust = element.replace(/stardust/gi, '')
					else if (element === 'stardust') {
						minDust = 1
						stardustTracking = -1
					}
					else if (element === 'shiny') mustShiny = 1
					else if (element === 'remove') remove = true
					else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				})
				_.forEach(questDts.rewardItems, (item, key) => {
					const re = new RegExp(` ${item}`, 'gi')
					if (rawArgs.match(re)) items.push(key)
				})
				if (rawArgs.match(/all pokemon/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1) // eslint-disable-line no-return-assign
				if (rawArgs.match(/all items/gi)) {
					_.forEach(questDts.rewardItems, (item, key) => {
						items.push(key)
					})
				}
				if (rawArgs.match(/stardust\d/gi)) {
					questTracks.push({
						id: target.id,
						reward: minDust,
						template,
						mustShiny: 0,
						reward_type: 3,
						distance,
					})
				}
				monsters.forEach((pid) => {
					questTracks.push({
						id: target.id,
						reward: pid,
						template,
						mustShiny,
						reward_type: 7,
						distance,
					})
				})
				items.forEach((i) => {
					questTracks.push({
						id: target.id,
						reward: i,
						template,
						mustShiny: 0,
						reward_type: 2,
						distance,
					})
				})
				if (!remove) {
					const insertData = questTracks.map(t => [t.id, t.reward, t.template, t.reward_type, t.distance, t.mustShiny])
					client.query.insertOrUpdateQuery(
						'quest',
						['id', 'reward', 'template', 'reward_type', 'distance', 'shiny'],
						insertData,
					).catch((O_o) => {})
					client.log.log({ level: 'debug', message: `${msg.author.username} added quest trackings to ${target.name}`, event: 'discord:quest' })
					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
				else {
					// in case no items or pokemon are in the command, add a dummy 0 to not break sql
					items.push(0)
					monsters.push(0)
					const remQuery = `
						delete from quest WHERE id=${target.id} and 
						((reward_type = 2 and reward in(${items})) or (reward_type = 7 and reward in(${monsters})) or (reward_type = 3 and reward > ${stardustTracking}))		
						`
					client.query.mysteryQuery(remQuery).then(() => {
						client.log.log({ level: 'debug', message: `${msg.author.username} removed quest trackings for ${target.name}`, event: 'discord:questRemove' })
					}).catch((O_o) => {})

					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}

			}
		})
		.catch((err) => {
			client.log.error(`commando !quest errored with: ${err.message} (command was "${msg.content}")`)
		})
}