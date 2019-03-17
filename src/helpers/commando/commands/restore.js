const _ = require('lodash')
const fs = require('fs')
const path = require('path')

exports.run = (client, msg, args) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		return msg.author.send('Please run commands in Direct Messages').catch((O_o) => {
			client.log.error(O_o.message)
		})
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) target = { id: msg.content.match(client.hookRegex), name: `Webhook-${_.random(99999)}` }

	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) {
				return msg.reply(`${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}webhook add <YourWebhook>`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
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
				const backups = []
				if (args[0]) {
					fs.readdirSync(path.join(__dirname, '/filterBackups')).forEach((file) => {
						if (file !== '.gitkeep') backups.push(file.replace('.sql', ''))
					})

					if (args[0] === 'list') {
						if (backups) {
							return msg.reply(`available backups are: ${backups.join(', ')}`).catch((O_o) => {
								client.log.error(O_o.message)
							})
						}

						return msg.reply('No backups have been made yet :(').catch((O_o) => {
							client.log.error(O_o.message)
						})

					}

					if (_.includes(backups, args[0])) {
						Promise.all([
							client.query.deleteQuery('monsters', 'id', target.id).catch((O_o) => {}),
							client.query.deleteQuery('raid', 'id', target.id).catch((O_o) => {}),
							client.query.deleteQuery('egg', 'id', target.id).catch((O_o) => {}),
							client.query.deleteQuery('quest', 'id', target.id).catch((O_o) => {}),
						]).then((x) => {
							const query = fs.readFileSync(path.join(__dirname, `/filterBackups/${args[0]}.sql`), 'utf8').replace('{{ target }}', target.id)
							client.query.mysteryQuery(query).catch((O_o) => {})
							msg.react('✅').catch((O_o) => {
								client.log.error(O_o.message)
							})
						})
					}
					else {
						msg.reply(`${args[0]} backup doesn't exist, use one of: ${backups.join(', ')}`).catch((O_o) => {
							client.log.error(O_o.message)
						})
					}


				}
			}
		})
		.catch((err) => {
			client.log.error(`commando !restore errored with: ${err.message} (command was "${msg.content}")`)
		})
}