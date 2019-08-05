const emojiStrip = require('emoji-strip')
const mustache = require('mustache')

module.exports = (client, oldMember, newMember) => {

	let before = false
	let after = false
	oldMember.roles.forEach((role) => {
		if (role.name === client.config.discord.userRole) before = true
	})
	newMember.roles.forEach((role) => {
		if (role.name === client.config.discord.userRole) after = true
	})

	if (!before && after) {
		client.query.countQuery('id', 'humans', 'id', oldMember.user.id)
			.then((isregistered) => {
				if (!isregistered) {
					client.query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[oldMember.user.id, emojiStrip(oldMember.user.username), '[]']])
					const view = { prefix: client.config.discord.prefix }
					const template = JSON.stringify(client.dts.greeting)
					const greeting = JSON.parse(mustache.render(template, view))
					oldMember.user.send(greeting)
					client.log.log({ level: 'debug', message: `registered ${oldMember.user.name} because ${client.config.discord.userRole} role removed`, event: 'discord:roleCheck' })

				}
			})
			.catch((err) => {
				client.log.error(`Role based registration errored with: ${err.message}`)
			})
	}

	if (before && !after) {
		client.query.countQuery('id', 'humans', 'id', oldMember.user.id)
			.then((isregistered) => {
				if (isregistered) {
					client.query.deleteQuery('egg', 'id', oldMember.user.id)
					client.query.deleteQuery('monsters', 'id', oldMember.user.id)
					client.query.deleteQuery('raid', 'id', oldMember.user.id)
					client.query.deleteQuery('quest', 'id', oldMember.user.id)
					client.query.deleteQuery('incident', 'id', oldMember.channel.id)
					client.query.deleteQuery('humans', 'id', oldMember.user.id)
					client.log.log({ level: 'debug', message: `unregistered ${oldMember.user.name} because ${client.config.discord.userRole} role removed`, event: 'discord:roleCheck' })
				}
			})
			.catch((err) => {
				client.log.error(`Role based unregistration errored with: ${err.message}`)
			})
	}
}