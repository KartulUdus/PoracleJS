const _ = require('lodash')
const mustache = require('mustache')

exports.run = (client, msg) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		return msg.author.send('Please run commands in Direct Messages').catch((O_o) => {
			client.log.error(O_o.message)
		})
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }

	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
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
				const message = client.dts.greeting
				message.embed.title = ''
				message.embed.description = ''
				const view = { prefix: client.config.discord.prefix }
				const template = JSON.stringify(message)
				const greeting = JSON.parse(mustache.render(template, view))
				msg.reply(greeting).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
		})
		.catch((err) => {
			client.log.error(`commando !COMMAND errored with: ${err.message} (command was "${msg.content}")`)
		})
}