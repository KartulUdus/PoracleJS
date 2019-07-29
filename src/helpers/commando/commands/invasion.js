const _ = require('lodash')

exports.run = (client, msg, args) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		return msg.author.send('Please run commands in Direct Messages').catch((O_o) => {
			client.log.error(O_o.message)
		})
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }

	if (_.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) {
		target = { id: msg.content.match(client.hookRegex)[0], name: `Webhook-${_.random(99999)}` }
		msg.content = msg.content.replace(client.hookRegex, '')
	}
	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) {
				return msg.reply(`${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'}  add <YourWebhook>`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
				return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}${client.config.discord.prefix}${client.config.commands.channel ? client.config.commands.channel : 'channel'} add`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && msg.channel.type === 'dm') {
				return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (isregistered) {
				let distance = 0
				let template = 3
				let remove = false

				args.forEach((element) => {
					if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
					else if (element.match(/remove/gi)) remove = true
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}
				})
				if (!remove) {
					
					const insertData = [ [target.id, template, distance] ]
					client.query.insertOrUpdateQuery(
						'incident',
						['id', 'template', 'distance'],
						insertData,
					).catch((O_o) => {})
					client.log.log({
						level: 'debug',
						message: `${msg.author.username} started tracking invasions in ${target.name}`,
						event: 'discord:invasion',
					})

					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
				else {
					client.query.deleteQuery('incident', 'id', target.id).catch((O_o) => {})
					client.log.log({ level: 'debug', message: `${msg.author.username} stopped tracking invasions in ${target.name}`, event: 'discord:uninvasion' })

					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
			}
		})
		.catch((err) => {
			client.log.error(`commando !invasion errored with: ${err.message} (command was "${msg.content}")`)
		})

}