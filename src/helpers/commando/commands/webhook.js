const _ = require('lodash')

exports.run = (client, msg, args) => {

	if (_.includes(client.config.discord.admins, msg.author.id)) {
		const target = { id: msg.content.match(client.hookRegex), name: `Webhook-${_.random(99999)}` }
		switch (args[0]) {
			case 'add': {
				if (msg.content.match(client.hookRegex)) {
					client.query.countQuery('id', 'humans', 'id', target.id)
						.then((isregistered) => {
							if (isregistered) {
								return msg.react('👌').catch((O_o) => {
									client.log.error(O_o.message)
								})
							}
							if (!isregistered) {
								client.query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[target.id, target.name, '[]']])
								msg.react('✅').catch((O_o) => {
									client.log.error(O_o.message)
								})
								msg.reply(`${target.name} has been registered`).catch((O_o) => {
									client.log.error(O_o.message)
								})
								client.log.log({ level: 'debug', message: `${msg.author.username} registered ${target.name}`, event: 'discord:registeredWebhook' })
							}
						})
						.catch((err) => {
							client.log.error(`commando !webhook add errored with: ${err.message}`)
						})
				}
				break
			}
			case 'remove': {
				if (msg.content.match(client.hookRegex)) {
					client.query.countQuery('id', 'humans', 'id', target.id)
						.then((isregistered) => {
							if (!isregistered) {
								return msg.react('👌')
									.catch((O_o) => {
										client.log.error(O_o.message)
									})
							}
							if (isregistered) {
								client.query.deleteQuery('egg', 'id', target.id)
								client.query.deleteQuery('monsters', 'id', target.id)
								client.query.deleteQuery('raid', 'id', target.id)
								client.query.deleteQuery('quest', 'id', target.id)
								client.query.deleteQuery('humans', 'id', target.id)
								msg.react('✅').catch((O_o) => {
									client.log.error(O_o.message)
								})
								client.log.log({ level: 'debug', message: `${msg.author.username} unregistered ${target.id}`, event: 'discord:unregisteredWebhook' })
							}
						})
						.catch((err) => {
							client.log.error(`commando !webhook remove errored with: ${err.message} (command was "${msg.content}")`)
						})
				}
				break
			}
			case 'list': {
				client.query.selectAllQuery('humans', 'enabled', 1).then((humans) => {
					let list = ''
					humans.forEach((human) => {
						if (human.id.match(client.hookRegex)) list = list.concat(`\n${human.name}: ${human.id}`)
					})
					if (list) {
						msg.reply(list).catch((O_o) => {
							client.log.error(O_o.message)
						})
					}
					else {
						msg.reply('No webhooks are currently registered').catch((O_o) => {
							client.log.error(O_o.message)
						})
					}
				})
				break
			}
			default:
		}
	}
}