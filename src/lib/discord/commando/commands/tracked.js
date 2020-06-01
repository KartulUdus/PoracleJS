const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }


	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = args.find((arg) => arg.match(client.re.nameRe))
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
		let locationText = ''
		if (+human.latitude !== 0 && +human.longitude !== 0) {
			locationText = `Your location is currently set to ${maplink}.`
		}
		await msg.reply(`Your alerts are currently ${human.enabled ? 'enabled' : 'disabled'}\n${locationText} You are currently set to receive alarms in ${human.area}`)

		let message = ''
		if (monsters.length) {
			message = message.concat(client.translator.translate('\n\nYou\'re  tracking the following monsters:\n'))
		} else message = message.concat(client.translator.translate('\n\nYou\'re not tracking any monsters'))

		monsters.forEach((monster) => {
			const mon = Object.values(client.monsters).find((m) => m.id === monster.pokemon_id && m.form.id === monster.form)
			const monsterName = mon.name
			let miniv = monster.min_iv
			let formName = mon.form.name
			if (formName === undefined) formName = 'none'
			if (miniv === -1) miniv = 0

			const greatLeague = monster.great_league_ranking >= 4096 ? 'any' : `top${monster.great_league_ranking} (@${monster.great_league_ranking_min_cp}+)`
			const ultraLeague = monster.ultra_league_ranking >= 4096 ? 'any' : `top${monster.ultra_league_ranking} (@${monster.ultra_league_ranking_min_cp}+)`
			message = message.concat(`\n**${monsterName}** form: ${formName} ${monster.distance ? `, distance: ${monster.distance}m` : ''} iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} stats: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.max_atk}/${monster.max_def}/${monster.max_sta} greatpvp: ${greatLeague} ultrapvp: ${ultraLeague} gender:${client.utilData.genders[monster.gender].emoji}`)
		})
		if (raids.length || eggs.length) {
			message = message.concat(client.translator.translate('\n\nYou\'re tracking the following raids:\n'))
		} else message = message.concat(client.translator.translate('\n\nYou\'re not tracking any raids'))
		raids.forEach((raid) => {
			const mon = Object.values(client.monsters).find((m) => m.id === raid.pokemon_id && m.form.id === raid.form)
			const monsterName = mon ? mon.name : 'levelMon'
			const raidTeam = client.utilData.teams[raid.team].name
			const formName = mon ? mon.form.name : 'levelMonForm'

			if (+raid.pokemon_id === 9000) {
				message = message.concat(`\n**level:${raid.level} raids** ${raid.distance ? `, distance: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` , controlled by ${raidTeam}`}${raid.exclusive ? ', must be in park' : ''}`)
			} else {
				message = message.concat(`\n**${monsterName}**${formName ? ` form: ${formName}` : ''}${raid.distance ? `, distance: ${raid.distance}m` : ''}${raid.team === 4 ? '' : `, controlled by ${raidTeam}`}${raid.exclusive ? ', must be in park' : ''}`)
			}
		})
		eggs.forEach((egg) => {
			const raidTeam = client.utilData.teams[egg.team].name
			message = message.concat(`\n**Level ${egg.level} eggs** ${egg.distance ? `, distance: ${egg.distance}m` : ''} ${egg.team === 4 ? '' : `, controlled by ${raidTeam}`}${egg.exclusive ? ', must be in park' : ''}`)
		})

		if (quests.length) {
			message = message.concat(client.translator.translate('\n\nYou\'re tracking the following quests:\n'))
		} else message = message.concat(client.translator.translate('\n\nYou\'re not tracking any quests'))

		quests.forEach((quest) => {
			let rewardThing = ''
			if (quest.reward_type === 7) rewardThing = Object.values(client.monsters).find((m) => m.id === quest.reward).name
			if (quest.reward_type === 3) rewardThing = `${quest.reward} or more stardust`
			if (quest.reward_type === 2) rewardThing = client.utilData.items[quest.reward]
			message = message.concat(`\nReward: ${rewardThing} distance: ${quest.distance}m `)
		})

		if (invasions.length) {
			message = message.concat(client.translator.translate('\n\nYou\'re tracking the following invasions:\n'))
		} else message = message.concat(client.translator.translate('\n\nYou\'re not tracking any invasions'))

		invasions.forEach((invasion) => {
			let genderText = ''
			let typeText = ''
			if (!invasion.gender || invasion.gender === '') {
				genderText = 'Gender: any, '
			} else if (invasion.gender === 1) {
				genderText = 'Gender: male, '
			} else if (invasion.gender === 2) {
				genderText = 'Gender: female, '
			}
			if (!invasion.grunt_type || invasion.grunt_type === '') {
				typeText = 'Any'
			} else {
				typeText = invasion.grunt_type
			}
			message = message.concat(client.translator.translate(`\nInvasion: ${genderText}Grunt type: ${typeText}`))
		})


		if (message.length < 6000) {
			return await msg.reply(message, { split: true })
		}

		try {
			const hastelink = await client.hastebin(message)
			return await msg.reply(`${target.name} tracking list is quite long. Have a look at ${hastelink}`)
		} catch (e) {
			const filepath = path.join(__dirname, `./${target.name}.txt`)
			fs.writeFileSync(filepath, message)
			await msg.reply(`${target.name} tracking list is long, but Hastebin is also down. ☹️ \nTracking list made into a file:`, { files: [filepath] })
			fs.unlinkSync(filepath)
			client.log.warn('Hastebin seems down, got error: ', e)
		}
	} catch (err) {
		client.log.error(`${msg.content} command unhappy: `, err)
	}
}
