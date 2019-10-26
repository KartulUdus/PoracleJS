const _ = require('lodash')

exports.run = (client, msg) => {

	const targets = []

	_.forEach(msg.mentions.users.array(), (user) => targets.push({ id: user.id, name: user.tag }))
	targets.push({ id: msg.author.id, name: msg.author.tag })
	const adminArray = targets.map((target) => target.id)

	msg.reply(`Mentioned users admins are ["${adminArray.join('", "')}"]`)
		.catch((err) => {
			client.log.error(`commando !unregister errored with: ${err.message} (command was "${msg.content}")`)
		})

}