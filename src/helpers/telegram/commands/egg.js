const _ = require('lodash')

module.exports = (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	const args = command.splitArgs

	let target = { id: user.id.toString(), name: user.first_name }
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

				let park = 0
				let distance = 0
				let levels = []
				let team = 4
				let template = 3
				let remove = false

				args.forEach((element) => {
					if (element.match(/ex/gi)) park = 1
					else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
					else if (element.match(/level\d/gi)) levels.push(element.replace(/level/gi, ''))
					else if (element.match(/instinct/gi)) team = 3
					else if (element.match(/valor/gi)) team = 2
					else if (element.match(/mystic/gi)) team = 1
					else if (element.match(/harmony/gi)) team = 0
					else if (element.match(/remove/gi)) remove = true
					else if (element.match(/everything/gi)) levels = [1, 2, 3, 4, 5]
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}

				})
				if (!remove) {
					if (levels.length) {
						const insertData = levels.map(level => [target.id, level, template, distance, park, team])
						controller.query.insertOrUpdateQuery(
							'egg',
							['id', 'raid_level', 'template', 'distance', 'park', 'team'],
							insertData,
						).catch((O_o) => {})
						ctx.reply('✅').catch((O_o) => {
							controller.log.error(O_o.message)
						})
						controller.log.log({ level: 'debug', message: `${user.first_name} started tracking level (${levels.join(', ')}) eggs in ${target.name}`, event: 'discord:egg' })
					}
					else {
						ctx.reply('404 NO LEVELS FOUND').catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}
				}
				else if (levels.length) {
					levels.forEach((level) => {
						controller.query.deleteByIdQuery('egg', 'raid_level', `${level}`, target.id).catch((O_o) => {})
					})
					ctx.reply('✅').catch((O_o) => {
						controller.log.error(O_o.message)
					})
					controller.log.log({ level: 'debug', message: `${user.first_name} removed tracking for level ${levels.join(', ')} eggs in ${target.name}`, event: 'discord:unegg' })
				}
				else {
					ctx.reply('404 NO MONSTERS FOUND').catch((O_o) => {
						controller.log.error(O_o.message)
					})
				}

			}
		})
		.catch((err) => {
			controller.log.error(`Telegram commando /egg errored with: ${err.message} (command was "${command.text}")`)
		})
}