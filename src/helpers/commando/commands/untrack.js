const _ = require('lodash')
const config = require('config')

let monsterDataPath = `${__dirname}/../../../util/monsters.json`
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = `${__dirname}/../../../util/locale/monsters${config.locale.language.toLowerCase()}.json`
}
const monsterData = require(monsterDataPath)
const typeData = require(`${__dirname}/../../../util/types`)

exports.run = (client, msg, args) => {
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
					if (element.match(/everything/gi)) {
						monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1) // eslint-disable-line no-return-assign
					}
				})

				if (monsters.length) {
					monsters.forEach((monster) => {
						client.query.deleteByIdQuery('monsters', 'pokemon_id', `${monster}`, target.id)
							.then(client.log.log({ level: 'debug', message: `${msg.author.username} removed pokemon tracking ${monsterData[monster].name}`, event: 'discord:untrack' }))
							.catch((O_o) => {})
					})

					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
				else {
					msg.reply('404 NO MONSTERS FOUND').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
			}
		})
		.catch((err) => {
			client.log.error(`commando !untrack errored with: ${err.message} (command was "${msg.content}")`)
		})
}