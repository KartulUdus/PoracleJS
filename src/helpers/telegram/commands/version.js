const _ = require('lodash')
const path = require('path')

const { version } = require(`${path.join(__dirname, '/../../../../')}package.json`)

module.exports = (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''

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

				Promise.all([controller.query.execPromise('git status'), controller.query.execPromise('git --no-pager log -3')]).then((output) => {
					let changes = output[0]
					changes = _.filter(changes.split('\n'), line => line.match(/modified/gi) || line.match(/renamed/gi) || line.match(/On branch/gi))
					const gitLogs = output[1].split('\n')
					const commitLines = []
					const gitMsgs = []
					const fields = []
					gitLogs.forEach((logLine, index) => {
						if (logLine.match(/commit/gi)) commitLines.push(index)
					})
					commitLines.push(gitLogs.length)
					commitLines.forEach((n, index) => {
						if (commitLines[index + 1]) {
							gitMsgs.push(gitLogs.slice(n, commitLines[index + 1]))
						}
					})
					gitMsgs.forEach((gitMsg) => {
						fields.push({
							name: `${gitMsg[1].split(' ')[1]} - ${new Date(gitMsg[2].slice(8)).toLocaleDateString()}`,
							value: `https://github.com/KartulUdus/PoracleJS/commit/${gitMsg[0].slice(7)} \n${gitMsg.slice(3).filter(line => line !== '').join('\n')}`,
						})
					})
					let message = `${ctx.botInfo.username} is running on V${version}`
					message = message.concat(`\n\n ${changes ? `**Git status** \n${changes.join('\n')} \n\n **Recent updates**` : '**Recent updates**'}`)
					fields.forEach((field) => {
						message = message.concat(`\n\n${field.name}\n${field.value}`)
					})
					ctx.reply(message).catch((O_o) => {
						controller.log.error(O_o.message)
					})

				}).catch((O_o) => {
					controller.log.error(O_o.message)
				})
			}
		})
		.catch((err) => {
			controller.log.error(`Telegram commando /version errored with: ${err.message} (command was "${command.text}")`)
		})
}