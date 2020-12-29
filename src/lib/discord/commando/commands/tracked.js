const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, command) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }
	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((args) => args.find((arg) => arg.match(client.re.nameRe)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(client.translator.translate('name'), ''), webhook: true }

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('webhook')} ${client.translator.translate('add')} ${client.translator.translate('<Your-Webhook-url>')}`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('channel')} ${client.translator.translate('add')}`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return await msg.react(client.translator.translate('🙅'))
		}
		if (target.webhook) target.id = isRegistered.id

		const monsters = await client.query.selectAllQuery('monsters', { id: target.id })
		const raids = await client.query.selectAllQuery('raid', { id: target.id })
		const eggs = await client.query.selectAllQuery('egg', { id: target.id })
		const human = (await client.query.selectAllQuery('humans', { id: target.id }))[0]
		const quests = await client.query.selectAllQuery('quest', { id: target.id })
		const invasions = await client.query.selectAllQuery('invasion', { id: target.id })
		const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
		if (command.find((args) => args.includes('area'))) {
			return msg.reply(`${client.translator.translate('You are currently set to receive alarms in')} ${human.area}`)
		}
		let locationText = ''
		if (+human.latitude !== 0 && +human.longitude !== 0) {
			locationText = `${client.translator.translate('Your location is currently set to')} ${maplink}\n`
		}
		await msg.reply(`${client.translator.translate('Your alerts are currently')} **${human.enabled ? `${client.translator.translate('enabled')}` : `${client.translator.translate('disabled')}`}**\n${locationText}${client.translator.translate('You are currently set to receive alarms in')} ${human.area}`)

		let message = ''

		if (!client.config.general.disablePokemon) {
			if (monsters.length) {
				message = message.concat('\n\n', client.translator.translate('You\'re tracking the following monsters:'), '\n')
			} else message = message.concat('\n\n', client.translator.translate('You\'re not tracking any monsters'))

			monsters.forEach((monster) => {
				let monsterName
				let formName

				if (monster.pokemon_id == 0) {
					monsterName = client.translator.translate('Everything')
					formName = ''
				} else {
					const mon = Object.values(client.monsters).find((m) => m.id === monster.pokemon_id && m.form.id === monster.form)
					monsterName = mon.name
					formName = mon.form.name
					if (formName === undefined) formName = ''
				}
				let miniv = monster.min_iv
				if (miniv === -1) miniv = 0

				const greatLeague = monster.great_league_ranking >= 4096 ? client.translator.translate('any') : `top${monster.great_league_ranking} (@${monster.great_league_ranking_min_cp}+)`
				const ultraLeague = monster.ultra_league_ranking >= 4096 ? client.translator.translate('any') : `top${monster.ultra_league_ranking} (@${monster.ultra_league_ranking_min_cp}+)`
				message = message.concat(`\n**${client.translator.translate(`${monsterName}`)}** ${client.translator.translate(`${formName}`)} ${monster.distance ? ` | ${client.translator.translate('distance')}: ${monster.distance}m` : ''} | ${client.translator.translate('iv')}: ${miniv}%-${monster.max_iv}% | ${client.translator.translate('cp')}: ${monster.min_cp}-${monster.max_cp} | ${client.translator.translate('level')}: ${monster.min_level}-${monster.max_level} | ${client.translator.translate('stats')}: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.max_atk}/${monster.max_def}/${monster.max_sta} | ${client.translator.translate('greatpvp')}: ${greatLeague} | ${client.translator.translate('ultrapvp')}: ${ultraLeague}${monster.gender ? ` | ${client.translator.translate('gender')}: ${client.utilData.genders[monster.gender].emoji}` : ''}`)
			})
		}

		if (!client.config.general.disableRaid) {
			if (raids.length || eggs.length) {
				message = message.concat('\n\n', client.translator.translate('You\'re tracking the following raids:'), '\n')
			} else message = message.concat('\n\n', client.translator.translate('You\'re not tracking any raids'))
			raids.forEach((raid) => {
				const mon = Object.values(client.monsters).find((m) => m.id === raid.pokemon_id && m.form.id === raid.form)
				const monsterName = mon ? client.translator.translate(mon.name) : 'levelMon'
				const raidTeam = client.translator.translate(client.utilData.teams[raid.team].name)
				const formName = mon ? client.translator.translate(mon.form.name) : 'levelMonForm'

				if (+raid.pokemon_id === 9000) {
					message = message.concat(`\n**${client.translator.translate('level').charAt(0).toUpperCase() + client.translator.translate('level').slice(1)} ${raid.level} ${client.translator.translate('raids')}** ${raid.distance ? ` | ${client.translator.translate('distance')}: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` | ${client.translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${client.translator.translate('must be an EX Gym')}` : ''}`)
				} else {
					message = message.concat(`\n**${monsterName}**${formName ? ` ${client.translator.translate('form')}: ${formName}` : ''}${raid.distance ? ` | ${client.translator.translate('distance')}: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` | ${client.translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${client.translator.translate('must be an EX Gym')}` : ''}`)
				}
			})
			eggs.forEach((egg) => {
				const raidTeam = client.translator.translate(client.utilData.teams[egg.team].name)
				message = message.concat(`\n**${client.translator.translate('level').charAt(0).toUpperCase() + client.translator.translate('level').slice(1)} ${egg.level} ${client.translator.translate('eggs')}** ${egg.distance ? ` | ${client.translator.translate('distance')}: ${egg.distance}m` : ''} ${egg.team === 4 ? '' : ` | ${client.translator.translate('controlled by')} ${raidTeam}`}${egg.exclusive ? ` | ${client.translator.translate('must be an EX Gym')}` : ''}`)
			})
		}

		if (!client.config.general.disableQuest) {
			if (quests.length) {
				message = message.concat('\n\n', client.translator.translate('You\'re tracking the following quests:'), '\n')
			} else message = message.concat('\n\n', client.translator.translate('You\'re not tracking any quests'))

			quests.forEach((quest) => {
				let rewardThing = ''
				if (quest.reward_type === 7) {
					rewardThing = Object.values(client.monsters).find((m) => m.id === quest.reward).name
					rewardThing = client.translator.translate(rewardThing)
				}
				if (quest.reward_type === 3) rewardThing = `${quest.reward} ${client.translator.translate('or more stardust')}`
				if (quest.reward_type === 2) rewardThing = client.translator.translate(client.utilData.items[quest.reward])
				if (quest.reward_type === 12) {
					if (quest.reward == 0) {
						rewardThing = `${client.translator.translate('mega energy')}`
					} else {
						const mon = Object.values(client.monsters).find((m) => m.id === quest.reward && m.form.id === 0)
						const monsterName = mon ? client.translator.translate(mon.name) : 'energyMon'
						rewardThing = `${client.translator.translate('mega energy')} ${monsterName}`
					}
				}
				message = message.concat(`\n${client.translator.translate('reward').charAt(0).toUpperCase() + client.translator.translate('reward').slice(1)}: **${rewardThing}**${quest.distance ? ` | ${client.translator.translate('distance')}: ${quest.distance}m` : ''}`)
			})
		}

		if (!client.config.general.disablePokestop) {
			if (invasions.length) {
				message = message.concat('\n\n', client.translator.translate('You\'re tracking the following invasions:'), '\n')
			} else message = message.concat('\n\n', client.translator.translate('You\'re not tracking any invasions'))

			invasions.forEach((invasion) => {
				let genderText = ''
				let typeText = ''
				if (!invasion.gender || invasion.gender === '') {
					genderText = client.translator.translate('any')
				} else if (invasion.gender === 1) {
					genderText = client.translator.translate('male')
				} else if (invasion.gender === 2) {
					genderText = client.translator.translate('female')
				}
				if (!invasion.grunt_type || invasion.grunt_type === '') {
					typeText = 'any'
				} else {
					typeText = invasion.grunt_type
				}
				message = message.concat(`\n${client.translator.translate('grunt type').charAt(0).toUpperCase() + client.translator.translate('grunt type').slice(1)}: **${client.translator.translate(typeText)}**${invasion.distance ? ` | ${client.translator.translate('distance')}: ${invasion.distance}m` : ''} | ${client.translator.translate('gender')}: ${genderText}`)
			})
		}

		if (message.length < 6000) {
			return await msg.reply(message, { split: true })
		}

		try {
			const hastelink = await client.hastebin(message)
			return await msg.reply(`${client.translator.translate('Tracking list is quite long. Have a look at')} ${hastelink}`)
		} catch (e) {
			const filepath = path.join(__dirname, `./${target.name}.txt`)
			fs.writeFileSync(filepath, message)
			await msg.reply(`${client.translator.translate('Tracking list is long, but Hastebin is also down. ☹️ \nTracking list made into a file:')}`, { files: [filepath] })
			fs.unlinkSync(filepath)
			client.log.warn('Hastebin seems down, got error: ', e)
		}
	} catch (err) {
		client.log.error(`${msg.content} command unhappy: `, err)
	}
}
