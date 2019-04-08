const _ = require('lodash')
const emojiStrip = require('emoji-strip')

module.exports = (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const args = command.splitArgs

	if (_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') {
		const target = { id: ctx.update.message.chat.id, name: ctx.update.message.chat.title.toLowerCase() }
		switch (args[0]) {
			case 'add': {
				controller.query.countQuery('id', 'humans', 'id', target.id)
					.then((isregistered) => {
						if (isregistered) {
							return ctx.reply('👌').catch((O_o) => {
								controller.log.error(O_o.message)
							})
						}
						if (!isregistered) {
							controller.query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[target.id, emojiStrip(target.name), '[]']])
							ctx.reply('✅').catch((O_o) => {
								controller.log.error(O_o.message)
							})
							ctx.reply(`${target.name} has been registered`).catch((O_o) => {
								controller.log.error(O_o.message)
							})
							controller.log.log({ level: 'debug', message: `${user.first_name} registered ${target.name}`, event: 'telegram:registeredChannel' })
						}
					})
					.catch((err) => {
						controller.log.error(`commando /channel add errored with: ${err.message}`)
					})
				break
			}
			case 'remove': {
				controller.query.countQuery('id', 'humans', 'id', target.id)
					.then((isregistered) => {
						if (!isregistered) {
							return ctx.reply('👌')
								.catch((O_o) => {
									controller.log.error(O_o.message)
								})
						}
						if (isregistered) {
							controller.query.deleteQuery('egg', 'id', target.id)
							controller.query.deleteQuery('monsters', 'id', target.id)
							controller.query.deleteQuery('raid', 'id', target.id)
							controller.query.deleteQuery('quest', 'id', target.id)
							controller.query.deleteQuery('humans', 'id', target.id)
							ctx.reply('✅').catch((O_o) => {
								controller.log.error(O_o.message)
							})
							controller.log.log({ level: 'debug', message: `${user.first_name} unregistered ${target.name}`, event: 'telegram:unregisteredChannel' })
						}
					})
					.catch((err) => {
						controller.log.error(`commando /channel remove errored with: ${err.message} (command was "${command.text}")`)
					})
				break
			}
			default:
		}
	}
}