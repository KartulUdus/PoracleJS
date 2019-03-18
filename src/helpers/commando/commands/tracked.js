const _ = require('lodash')
const fs = require('fs')
const path = require('path')
const hastebin = require('hastebin-gen')
const config = require('config')

let monsterDataPath = `${__dirname}/../../../util/monsters.json`
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = `${__dirname}/../../../util/locale/monsters${config.locale.language.toLowerCase()}.json`
}
const monsterData = require(monsterDataPath)
const teamData = require(`${__dirname}/../../../util/teams`)
const formData = require(`${__dirname}/../../../util/forms`)
const genderData = require(`${__dirname}/../../../util/genders`)
const questDts = require('../../../../config/questdts')


exports.run = (client, msg) => {
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
				Promise.all([
					client.query.selectAllQuery('monsters', 'id', target.id),
					client.query.selectAllQuery('raid', 'id', target.id),
					client.query.selectAllQuery('egg', 'id', target.id),
					client.query.selectOneQuery('humans', 'id', target.id),
					client.query.selectAllQuery('quest', 'id', target.id),
				]).then((data) => {
					const monsters = data[0]
					const raids = data[1]
					const eggs = data[2]
					const human = data[3]
					const quests = data[4]
					const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
					msg.reply(`👋\nYour location is currently set to ${maplink} \nand you currently are set to receive alarms in ${human.area}`).catch((O_o) => {
						client.log.error(O_o.message)
					})
					let message = ''
					if (monsters.length) {
						message = message.concat('\n\nYou\'re  tracking the following monsters:\n')
					}
					else message = message.concat('\n\nYou\'re not tracking any monsters')

					monsters.forEach((monster) => {
						const monsterName = monsterData[monster.pokemon_id].name
						let miniv = monster.min_iv
						let formName = formData[monster.pokemon_id] ? formData[monster.pokemon_id][monster.form] : 'none'
						if (formName === undefined) formName = 'none'
						if (miniv === -1) miniv = 0
						message = message.concat(`\n**${monsterName}** form: ${formName} distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} stats: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.maxAtk}/${monster.maxDef}/${monster.maxSta}, gender:${genderData[monster.gender]}`)
					})
					if (raids.length || eggs.length) {
						message = message.concat('\n\nYou\'re tracking the following raids:\n')
					}
					else message = message.concat('\n\nYou\'re not tracking any raids')
					raids.forEach((raid) => {
						const monsterName = monsterData[raid.pokemon_id].name
						const raidTeam = teamData[raid.team].name
						let formName = formData[raid.pokemon_id] ? formData[raid.pokemon_id][raid.form] : 'none'
						if (formName === undefined) formName = 'none'

						if (parseInt(raid.pokemon_id, 10) === 721) {
							message = message.concat(`\n**level:${raid.level} raids** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`)
						}
						else {
							message = message.concat(`\n**${monsterName}** form: ${formName}, distance: ${raid.distance}m controlled by ${raidTeam}, must be in park: ${raid.park}`)
						}
					})
					eggs.forEach((egg) => {
						const raidTeam = teamData[egg.team].name
						message = message.concat(`\n**Level ${egg.raid_level} eggs** distance: ${egg.distance}m controlled by ${raidTeam} , must be in park: ${egg.park}`)
					})

					if (quests.length) {
						message = message.concat('\n\nYou\'re tracking the following quests:\n')
					}
					else message = message.concat('\n\nYou\'re not tracking any quests')

					quests.forEach((quest) => {
						let rewardThing = ''
						if (quest.reward_type === 7) rewardThing = monsterData[quest.reward].name
						if (quest.reward_type === 3) rewardThing = `${quest.reward} or more stardust`
						if (quest.reward_type === 2) rewardThing = questDts.rewardItems[quest.reward]
						message = message.concat(`\nReward: ${rewardThing} distance: ${quest.distance}m `)
					})
					client.log.log({ level: 'debug', message: `${msg.author.username} checked trackings`, event: 'discord:tracked' })

					if (message.length < 6000) {
						msg.reply(message, { split: true })
					}
					else {
						const hastebinMessage = hastebin(message)
						hastebinMessage
							.then((hastelink) => {
								msg.reply(`${target.name} tracking list is quite long. Have a look at ${hastelink}`).catch((O_o) => {
									client.log.error(O_o.message)
								})
							})
							.catch((err) => {
								const filepath = path.join(__dirname, `../../../../.cache/${human.name}.txt`)
								fs.writeFileSync(filepath, message)
								msg.reply(`${target.name} tracking list is long, but Hastebin is also down. ☹️ \nTracking list made into a file:`, { files: [filepath] }).catch((O_o) => {
									client.log.error(O_o.message)
								})
									.then(() => {
										fs.unlinkSync(filepath)
									})
								client.log.error(`Hastebin unhappy: ${err.message}`)

							})
					}
				})
			}
		})
		.catch((err) => {
			client.log.error(`commando !COMMAND errored with: ${err.message} (command was "${msg.content}")`)
		})
}