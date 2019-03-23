const _ = require('lodash')
const fs = require('fs')
const path = require('path')

exports.run = (client, msg, args) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id)) {
		return
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }

	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
				return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && msg.channel.type === 'dm') {
				return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}poracle to #${client.config.discord.channel}`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (isregistered) {
				// don't accept list as an arg, it will be used in restoring later
				if (args.indexOf('list') > -1) {
					args.splice(args.indexOf('list'), 1)
				}
				if (_.includes(args, 'remove')) {
					if (args.length < 2) {
						return msg.reply('Please add trackings before making backups').catch((O_o) => {
							client.log.error(O_o.message)
						})
					}
					args.forEach((arg) => {
						if (fs.existsSync(path.join(__dirname, `/filterBackups/${arg}.sql`))) {
							fs.unlinkSync(path.join(__dirname, `/filterBackups/${arg}.sql`))
						}
					})
					return msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}

				if (args[0]) {
					const backupTables = ['monsters', 'raid', 'egg', 'quest']
					Promise.all([
						client.query.getColumns('monsters'),
						client.query.getColumns('raid'),
						client.query.getColumns('egg'),
						client.query.getColumns('quest'),
						client.query.selectAllQuery('monsters', 'id', target.id),
						client.query.selectAllQuery('raid', 'id', target.id),
						client.query.selectAllQuery('egg', 'id', target.id),
						client.query.selectAllQuery('quest', 'id', target.id),
					]).then((data) => {
						let query = ''
						let i
						let	u
						for (i = 0, u = 4; i < 4; i += 1, u += 1) {
							data[u] = data[u].map(obj => Object.values(obj))
							if (data[u].length) {
								const cols = data[i].join(', ')
								const multiValues = Object.values(data[u]).map(x => x.map(y => (typeof y === 'boolean' ? y : `'${y}'`)).join()).join('), (')
								const duplicate = data[i].map(x => `\`${x}\`=VALUES(\`${x}\`)`).join(', ')
								const queryChunk = `INSERT INTO ${backupTables[i]} (${cols})
											  VALUES (${multiValues})
											  ON DUPLICATE KEY UPDATE ${duplicate}; `
								query = query.concat(queryChunk)
							}
						}
						query = query.replace(new RegExp(`'${target.id}'`, 'g'), '\'{{ target }}\'')
						query = query.replace(/\s\s+/g, ' ').replace(';', ';\n')
						if (query) {
							fs.writeFileSync(path.join(__dirname, '/filterBackups/', `${args[0]}.sql`), query)
							msg.react('✅').catch((O_o) => {
								client.log.error(O_o.message)
							})
						}
						else {
							msg.reply('Please add trackings before making backups').catch((O_o) => {
								client.log.error(O_o.message)
							})
						}

					}).catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
				else {
					msg.reply(`Your backup needs a name, please run \`${client.config.discord.prefix}backup awesomeFiltersetName\``)
						.catch((O_o) => {
							client.log.error(O_o.message)
						})
				}


			}
		})
		.catch((err) => {
			client.log.error(`commando !backup errored with: ${err.message} (command was "${msg.content}")`)
		})
}