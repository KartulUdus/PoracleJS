const _ = require('lodash')
const geofence = require('../../../../config/geofence.json')

const confAreas = geofence.map(area => area.name.toLowerCase())


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
				switch (args[0]) {
					case 'add': {
						client.query.selectOneQuery('humans', 'id', target.id).then((human) => {
							const oldArea = JSON.parse(human.area.split())
							const validAreas = confAreas.filter(x => args.includes(x))
							const addAreas = validAreas.filter(x => !oldArea.includes(x))
							const newAreas = oldArea.concat(addAreas)
							if (addAreas.length) client.query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', target.id)
							if (!validAreas.length) {
								return msg.reply(`no valid areas there, please use one of ${confAreas}`).catch((O_o) => {
									client.log.error(O_o.message)
								})
							}
							if (addAreas.length) {
								msg.reply(`Added areas: ${addAreas}`).catch((O_o) => {
									client.log.error(O_o.message)
								})
								client.log.log({ level: 'debug', message: `${msg.author.tag} added area ${addAreas} for ${target.name}`, event: 'discord:areaAdd' })
							}
							else {
								msg.react('👌').catch((O_o) => {
									client.log.error(O_o.message)
								})
							}
						})
							.catch((err) => {
								client.log.error(`selectOneQuery on !area add unhappy; ${err.message}`)
							})
						break
					}
					case 'remove': {
						client.query.selectOneQuery('humans', 'id', target.id).then((human) => {
							const oldArea = JSON.parse(human.area.split())
							const validAreas = oldArea.filter(x => args.includes(x))
							const removeAreas = validAreas.filter(x => oldArea.includes(x))
							const newAreas = oldArea.filter(x => !removeAreas.includes(x))
							if (removeAreas.length) {
								client.query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', target.id).catch((O_o) => {})
							}
							if (!validAreas.length) {
								return msg.reply(`404 NO VALID AND TRACKED AREAS FOUND \n VALID: ${confAreas} \n TRACKED: ${oldArea}`).catch((O_o) => {
									client.log.error(O_o.message)
								})
							}
							if (removeAreas.length) {
								msg.reply(`Removed areas: ${removeAreas}`)
								client.log.log({ level: 'debug', message: `${msg.author.tag} removed area ${removeAreas} for ${target.name}`, event: 'discord:areaRemove' })
							}
							else {
								msg.react('👌').catch((O_o) => {
									client.log.error(O_o.message)
								})
							}
						})
							.catch((err) => {
								client.log.error(`selectOneQuery on !area remove unhappy; ${err.message}`)
							})
						break
					}
					case 'list': {
						msg.reply(`Current configured areas are ${confAreas}`).catch((O_o) => {
							client.log.error(O_o.message)
						})
						client.log.log({ level: 'debug', message: `${msg.author.tag} checked areas for ${target.name}`, event: 'discord:areaList' })
						break
					}
					default:
				}
			}
		})
		.catch((err) => {
			client.log.error(`commando !area errored with: ${err.message} (command was "${msg.content}")`)
		})
}