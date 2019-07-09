const _ = require('lodash')

exports.run = (client, msg, args) => {
	const search = args.join(' ')
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
				client.query.geolocate(search).then((location) => {
					client.query.updateLocation('humans', location[0].latitude, location[0].longitude, 'id', target.id).catch((O_o) => {})
					const maplink = `https://www.google.com/maps/search/?api=1&query=${location[0].latitude},${location[0].longitude}`
					msg.reply(`:wave:, I set ${target.name}s location to : \n${maplink}`)
					msg.react('✅')
				}).catch((O_o) => {})
			}
		})
		.catch((err) => {
			client.log.error(`commando !location errored with: ${err.message} (command was "${msg.content}")`)
		})
}