const _ = require('lodash')
const fs = require('fs')
const path = require('path')

module.exports = (ctx) => {

	const { controller, command } = ctx.state
	const user = ctx.update.message.from
	const channelName = ctx.update.message.chat.title ? ctx.update.message.chat.title : ''
	const args = command.splitArgs

	let target = { id: user.id.toString(), name: user.first_name }
	if (!_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group' || ctx.update.message.chat.type === 'supergroup') {
		return ctx.telegram.sendMessage(user.id, 'Please run commands in Direct Messages').catch((O_o) => {
			controller.log.error(O_o.message)
		})
	}
	if (_.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group' || ctx.update.message.chat.type === 'supergroup') target = { id: ctx.update.message.chat.id.toString(), name: ctx.update.message.chat.title }
	controller.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(controller.config.telegram.admins, user.id.toString()) && ctx.update.message.chat.type === 'group' || ctx.update.message.chat.type === 'supergroup') {
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
				// don't accept list as an arg, it will be used in restoring later
				if (args.indexOf('list') > -1) {
					args.splice(args.indexOf('list'), 1)
				}
				if (_.includes(args, 'remove')) {
					if (args.length < 2) {
						return ctx.reply('Please add trackings before making backups').catch((O_o) => {
							controller.log.error(O_o.message)
						})
					}
					args.forEach((arg) => {
						if (fs.existsSync(path.join(__dirname, '../../commando/commands', `/filterBackups/${arg}.sql`))) {
							fs.unlinkSync(path.join(__dirname, '../../commando/commands', `/filterBackups/${arg}.sql`))
						}
					})
					return ctx.reply('✅').catch((O_o) => {
						controller.log.error(O_o.message)
					})
				}

				if (args[0]) {
					const backupTables = ['monsters', 'raid', 'egg', 'quest', 'incident']
					Promise.all([
						controller.query.getColumns('monsters'),
						controller.query.getColumns('raid'),
						controller.query.getColumns('egg'),
						controller.query.getColumns('quest'),
						controller.query.getColumns('incident'),
						controller.query.selectAllQuery('monsters', 'id', target.id),
						controller.query.selectAllQuery('raid', 'id', target.id),
						controller.query.selectAllQuery('egg', 'id', target.id),
						controller.query.selectAllQuery('quest', 'id', target.id),
						controller.query.selectAllQuery('incident', 'id', target.id),
					]).then((data) => {
						let query = ''
						let i
						let	u
						for (i = 0, u = 5; i < 5; i += 1, u += 1) {
							data[u] = data[u].map((obj) => Object.values(obj))
							if (data[u].length) {
								const cols = data[i].join(', ')
								const multiValues = Object.values(data[u]).map((x) => x.map((y) => (typeof y === 'boolean' ? y : `'${y}'`)).join()).join('), (')
								const duplicate = data[i].map((x) => `\`${x}\`=VALUES(\`${x}\`)`).join(', ')
								const queryChunk = `INSERT INTO ${backupTables[i]} (${cols})
											  VALUES (${multiValues})
											  ON DUPLICATE KEY UPDATE ${duplicate}; `
								query = query.concat(queryChunk)
							}
						}
						query = query.replace(new RegExp(`'${target.id}'`, 'g'), '\'{{ target }}\'')
						query = query.replace(/\s\s+/g, ' ').replace(';', ';\n')
						if (query) {
							fs.writeFileSync(path.join(__dirname, '../../commando/commands', '/filterBackups/', `${args[0]}.sql`), query)
							ctx.reply('✅').catch((O_o) => {
								controller.log.error(O_o.message)
							})
						}
						else {
							ctx.reply('Please add trackings before making backups').catch((O_o) => {
								controller.log.error(O_o.message)
							})
						}

					}).catch((O_o) => {
						controller.log.error(O_o.message)
					})
				}
				else {
					ctx.reply('Your backup needs a name, please run `/backup awesomeFiltersetName`')
						.catch((O_o) => {
							controller.log.error(O_o.message)
						})
				}

			}
		})
		.catch((err) => {
			controller.log.error(`Telegram commando /backup errored with: ${err.message} (command was "${ctx.state.command.text}")`)
		})
}