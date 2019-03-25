const _ = require('lodash')
const fs = require('fs')
const path = require('path')

module.exports = (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	const args = command.splitArgs

	let target = { id: user.id.toString(), name: user.username }
	if (!_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') {
		return ctx.telegram.sendMessage(user.id, 'Please run commands in Direct Messages').catch((O_o) => {
			controller.log.error(O_o.message)
		})
	}
	if (_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') target = { id: ctx.update.message.chat.id.toString(), name: ctx.update.message.chat.title }
	controller.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group') {
				return ctx.reply(`${channelName} does not seem to be registered. add it with /channel add`).catch((O_o) => {
					controller.log.error(O_o.message)
				})
			}
			if (!isregistered && ctx.update.message.chat.type === 'private') {
				return ctx.telegram.sendMessage(user.id, `You don't seem to be registered. \nYou can do this by sending /poracle to @${controller.config.telegram.channel}`).catch((O_o) => {
					controller.log.error(O_o.message)
				})
			}
			if (isregistered) {

				const backups = []
				if (args[0]) {
					fs.readdirSync(path.join(__dirname, '../../commando/commands', '/filterBackups')).forEach((file) => {
						if (file !== '.gitkeep') backups.push(file.replace('.sql', ''))
					})

					if (args[0] === 'list') {
						if (backups) {
							return ctx.reply(`available backups are: ${backups.join(', ')}`).catch((O_o) => {
								controller.log.error(O_o.message)
							})
						}

						return ctx.reply('No backups have been made yet :(').catch((O_o) => {
							controller.log.error(O_o.message)
						})

					}

					if (_.includes(backups, args[0])) {
						Promise.all([
							controller.query.deleteQuery('monsters', 'id', target.id).catch((O_o) => {}),
							controller.query.deleteQuery('raid', 'id', target.id).catch((O_o) => {}),
							controller.query.deleteQuery('egg', 'id', target.id).catch((O_o) => {}),
							controller.query.deleteQuery('quest', 'id', target.id).catch((O_o) => {}),
						]).then((x) => {
							const query = fs.readFileSync(path.join(__dirname, '../../commando/commands', `/filterBackups/${args[0]}.sql`), 'utf8').replace('{{ target }}', target.id)
							controller.query.mysteryQuery(query).catch((O_o) => {})
							ctx.reply('✅').catch((O_o) => {
								controller.log.error(O_o.message)
							})
						})
					}
					else {
						ctx.reply(`${args[0]} backup doesn't exist, use one of: ${backups.join(', ')}`).catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}


				}
			}
		})
		.catch((err) => {
			controller.log.error(`Telegram commando /restore errored with: ${err.message} (command was "${command.text}")`)
		})
}