const _ = require('lodash')

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
				let park = 0
				let distance = 0
				let levels = []
				let team = 4
				let template = 3
				let remove = false

				args.forEach((element) => {
					if (element.match(/ex/gi)) park = 1
					else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
					else if (element.match(/level\d/gi)) levels.push(element.replace(/level/gi, ''))
					else if (element.match(/instinct/gi)) team = 3
					else if (element.match(/valor/gi)) team = 2
					else if (element.match(/mystic/gi)) team = 1
					else if (element.match(/harmony/gi)) team = 0
					else if (element.match(/remove/gi)) remove = true
					else if (element.match(/everything/gi)) levels = [1, 2, 3, 4, 5]
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}

				})
				if (!remove) {
					if (levels.length) {
						const insertData = levels.map(level => [target.id, level, template, distance, park, team])
						client.query.insertOrUpdateQuery(
							'egg',
							['id', 'raid_level', 'template', 'distance', 'park', 'team'],
							insertData,
						).catch((O_o) => {})
						msg.react('✅').catch((O_o) => {
							client.log.error(O_o.message)
						})
						client.log.log({ level: 'debug', message: `${msg.author.username} started tracking level (${levels.join(', ')}) eggs in ${target.name}`, event: 'discord:egg' })
					}
					else {
						msg.reply('404 NO LEVELS FOUND').catch((O_o) => {
							client.log.error(O_o.message)
						})
					}
				}
				else if (levels.length) {
					levels.forEach((level) => {
						client.query.deleteByIdQuery('egg', 'raid_level', `${level}`, target.id).catch((O_o) => {})
					})
					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
					client.log.log({ level: 'debug', message: `${msg.author.username} removed tracking for level ${levels.join(', ')} eggs in ${target.name}`, event: 'discord:unegg' })
				}
				else {
					msg.reply('404 NO MONSTERS FOUND').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
			}
		})
		.catch((err) => {
			client.log.error(`commando !egg errored with: ${err.message} (command was "${msg.content}")`)
		})
}