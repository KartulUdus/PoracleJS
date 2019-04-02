const _ = require('lodash')

module.exports = async (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const targets = []
	const mentions = []
	const args = ctx.state.command.splitArgs
	args.forEach((arg) => {
		if (arg.startsWith('@')) {
			mentions.push(arg.replace('@', ''))
		}
	})


	if (_.includes(controller.config.telegram.admins, user.id.toString())) {
		let extraTargets = []
		try {
			if (mentions.length) extraTargets = await controller.query.selectAllInQuery('humans', 'name', mentions)
		}
		catch (err) {
			controller.log.error(`Failed to get menitoned users for telegram: ${err.message}`)
			extraTargets = []
		}

		extraTargets.forEach((target) => {
			if (target.id.length < 15) targets.push({ id: target.id, name: target.name })
		})
	}
	if (!targets.length) targets.push({ id: user.id, name: user.first_name })
	targets.forEach((target) => {
		controller.query.countQuery('id', 'humans', 'id', target.id)
			.then((isregistered) => {
				if (isregistered) {
					ctx.reply(`${target.name} ✅`).catch((O_o) => {
						controller.log.error(O_o.message)
					})
					controller.query.deleteQuery('egg', 'id', target.id).catch((O_o) => {})
					controller.query.deleteQuery('monsters', 'id', target.id).catch((O_o) => {})
					controller.query.deleteQuery('raid', 'id', target.id).catch((O_o) => {})
					controller.query.deleteQuery('quest', 'id', target.id).catch((O_o) => {})
					controller.query.deleteQuery('humans', 'id', target.id).catch((O_o) => {})
					controller.log.log({ level: 'debug', message: `${user.first_name} unregistered ${target.name}`, event: 'discord:unregistered' })

				}
				else {
					ctx.reply(`${target.name} 👌 `).catch((O_o) => {
						controller.log.error(O_o.message)
					})
				}
			})
			.catch((err) => {
				controller.log.error(`Telegram commando /unregister errored with: ${err.message} (command was "${command.text}")`)
			})
	})


}