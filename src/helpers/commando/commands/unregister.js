const _ = require('lodash')

exports.run = (client, msg) => {

	const targets = []
	if (_.includes(client.config.discord.admins, msg.author.id)) {
		_.forEach(msg.mentions.users.array(), user => targets.push({ id: user.id, name: user.tag }))
		_.forEach(msg.mentions.channels.array(), channel => targets.push({ id: channel.id, name: channel.name }))
	}
	if (!targets) targets.push({ id: msg.author.id, name: msg.author.tag })

	targets.forEach((target) => {
		client.query.countQuery('id', 'humans', 'id', target.id)
			.then((isregistered) => {
				if (isregistered) {
					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
					client.query.deleteQuery('egg', 'id', target.id).catch((O_o) => {})
					client.query.deleteQuery('monsters', 'id', target.id).catch((O_o) => {})
					client.query.deleteQuery('raid', 'id', target.id).catch((O_o) => {})
					client.query.deleteQuery('quest', 'id', target.id).catch((O_o) => {})
					client.query.deleteQuery('humans', 'id', target.id).catch((O_o) => {})
					client.log.log({ level: 'debug', message: `${msg.author.tag} unregistered ${target.name}`, event: 'discord:unregistered' })

				}
				else {
					msg.react('👌').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
			})
			.catch((err) => {
				client.log.error(`commando !unregister errored with: ${err.message} (command was "${msg.content}")`)
			})
	})


}