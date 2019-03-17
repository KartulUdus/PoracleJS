const _ = require('lodash')
const emojiStrip = require('emoji-strip')

exports.run = (client, msg, args) => {

	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		switch (args[0]) {
			case 'add': {
				client.query.countQuery('id', 'humans', 'id', msg.channel.id)
					.then((isregistered) => {
						if (isregistered) {
							return msg.react('👌').catch((O_o) => {
								client.log.error(O_o.message)
							})
						}
						if (!isregistered) {
							client.query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[msg.channel.id, emojiStrip(msg.channel.name), '[]']])
							msg.react('✅').catch((O_o) => {
								client.log.error(O_o.message)
							})
							msg.reply(`${msg.channel.name} has been registered`).catch((O_o) => {
								client.log.error(O_o.message)
							})
							client.log.log({ level: 'debug', message: `${msg.author.username} registered ${msg.channel.name}`, event: 'discord:registeredChannel' })
						}
					})
					.catch((err) => {
						client.log.error(`commando !channel add errored with: ${err.message}`)
					})
				break
			}
			case 'remove': {
				client.query.countQuery('id', 'humans', 'id', msg.channel.id)
					.then((isregistered) => {
						if (!isregistered) {
							return msg.react('👌')
								.catch((O_o) => {
									client.log.error(O_o.message)
								})
						}
						if (isregistered) {
							client.query.deleteQuery('egg', 'id', msg.channel.id)
							client.query.deleteQuery('monsters', 'id', msg.channel.id)
							client.query.deleteQuery('raid', 'id', msg.channel.id)
							client.query.deleteQuery('quest', 'id', msg.channel.id)
							client.query.deleteQuery('humans', 'id', msg.channel.id)
							msg.react('✅').catch((O_o) => {
								client.log.error(O_o.message)
							})
							client.log.log({ level: 'debug', message: `${msg.author.username} unregistered ${msg.channel.name}`, event: 'discord:unregisteredChannel' })
						}
					})
					.catch((err) => {
						client.log.error(`commando !channel remove errored with: ${err.message} (command was "${msg.content}")`)
					})
				break
			}
			default:
		}
	}
}