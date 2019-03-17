const emojiStrip = require('emoji-strip')

exports.run = (client, msg) => {
	if (msg.channel.name !== client.config.discord.channel) {
		return client.log.log({ level: 'info', message: `${msg.author.tag} tried to register in ${msg.channel.name}`, event: 'discord:registerFail' })
	}

	client.query.countQuery('id', 'humans', 'id', msg.author.id)
		.then((isregistered) => {
			if (isregistered) {
				msg.react('👌').catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered) {
				client.query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[msg.author.id, emojiStrip(msg.author.username), '[]']]).catch((O_o) => {})
				msg.react('✅').catch((O_o) => {
					client.log.error(O_o.message)
				})
				msg.author.send(client.dts.greeting).catch((O_o) => {
					client.log.error(O_o.message)
				})
				client.log.log({ level: 'debug', message: `${msg.author.tag} registered`, event: 'discord:registered' })
			}
		})
		.catch((err) => {
			client.log.error(`commando !poracle errored with: ${err.message}`)
		})
}