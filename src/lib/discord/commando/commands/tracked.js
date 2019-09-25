const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send('Please run commands in Direct Messages')
		}
		let webhookName = args.find(arg => arg.match(/name\S+/gi))
		if (webhookName) webhookName = webhookName.replace('name', '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) {
			target = { name: webhookName.replace(/name/gi, ''), webhook: true }
			msg.content = msg.content.replace(client.hookRegex, '')
		}

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'}  add <Your-Webhook-url>`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {})
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}
		if (target.webhook) target.id = isRegistered.id

		const monsters = await client.query.selectAllQuery('monsters', {id: target.id})
		const raids = await client.query.selectAllQuery('raid', {id: target.id})
		const eggs = await client.query.selectAllQuery('egg', {id: target.id})
		const human = await client.query.selectAllQuery('humans', {id: target.id})
		const quests = await client.query.selectAllQuery('quest', {id: target.id})
		const invasions = await client.query.selectAllQuery('invasion', {id: target.id})
		const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
		let locationText = 'Y'
		if (human.latitude !== 0 && human.longitude !== 0) {
			locationText = `Your location is currently set to ${maplink} \nand y`
		}
		msg.reply(`👋\n${locationText}ou are currently set to receive alarms in ${human.area}`).catch((O_o) => {
			client.log.error(O_o.message)
		})
		let message = ''
		if (monsters.length) {
			message = message.concat('\n\nYou\'re  tracking the following monsters:\n')
		}
		else message = message.concat('\n\nYou\'re not tracking any monsters')

		monsters.forEach((monster) => {
			const mon = Object.values(client.monsters).find(m => m.id === monster.pokemon_id && m.form.id === monster.form)
			const monsterName = mon.name
			let miniv = monster.min_iv
			let formName = mon.form.name
			if (formName === undefined) formName = 'none'
			if (miniv === -1) miniv = 0
			message = message.concat(`\n**${monsterName}** form: ${formName} distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} stats: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.max_atk}/${monster.max_def}/${monster.max_sta}, gender:${client.utilData.genders[monster.gender]}`)
		})
		if (raids.length || eggs.length) {
			message = message.concat('\n\nYou\'re tracking the following raids:\n')
		}
		else message = message.concat('\n\nYou\'re not tracking any raids')
		raids.forEach((raid) => {
			const mon = Object.values(client.monsters).find(m => m.id === raid.pokemon_id && m.form.id === raid.form)

			const monsterName = mon.name
			const raidTeam = client.utilData.teams[raid.team].name
			let formName = mon.form.name

			if (+raid.pokemon_id === 9000) {
				message = message.concat(`\n**level:${raid.level} raids** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`)
			}
			else {
				message = message.concat(`\n**${monsterName}** form: ${formName}, distance: ${raid.distance}m controlled by ${raidTeam}, must be in park: ${raid.park}`)
			}
		})
		eggs.forEach((egg) => {
			const raidTeam = client.utilData.teams[egg.team].name
			message = message.concat(`\n**Level ${egg.raid_level} eggs** distance: ${egg.distance}m controlled by ${raidTeam} , must be in park: ${egg.park}`)
		})

		if (quests.length) {
			message = message.concat('\n\nYou\'re tracking the following quests:\n')
		}
		else message = message.concat('\n\nYou\'re not tracking any quests')

		quests.forEach((quest) => {
			let rewardThing = ''
			if (quest.reward_type === 7) rewardThing = Object.values(client.monsters).find(m => m.id === quest.reward).name
			if (quest.reward_type === 3) rewardThing = `${quest.reward} or more stardust`
			// Todo if (quest.reward_type === 2) rewardThing = questDts.rewardItems[quest.reward]
			message = message.concat(`\nReward: ${rewardThing} distance: ${quest.distance}m `)
		})

		if (invasions.length) {
			message = message.concat('\n\nYou\'re tracking the following invasions:\n')
		}
		else message = message.concat('\n\nYou\'re not tracking any invasions')

		invasions.forEach((invasion) => {
			let genderText = ''
			let typeText = ''
			if (invasion.gender === 1) {
				genderText = 'Gender: male, '
			}
			else if (invasion.gender === 2) {
				genderText = 'Gender: female, '
			}
			if (!invasion.gruntType || invasion.gruntType === '') {
				typeText = 'Any'
			}
			else {
				typeText = invasion.gruntType
			}
			message = message.concat(`\nInvasion: ${genderText}Grunt type: ${typeText}`)
		})


		if (message.length < 6000) {
			msg.reply(message, { split: true })
		}
		else {
			try {
				const hastelink = await client.hastebin(message)
				await msg.reply(`${target.name} tracking list is quite long. Have a look at ${hastelink}`)
			} catch (e) {
				const filepath = path.join(__dirname, `./${human.name}.txt`)
				fs.writeFileSync(filepath, message)
				await msg.reply(`${target.name} tracking list is long, but Hastebin is also down. ☹️ \nTracking list made into a file:`, { files: [filepath] })
				fs.unlinkSync(filepath)
				client.log.warn('Hastebin seems down, got error: ', e)
			}

		}
		
	} catch (err) {
		client.log.error(`${msg.content} command unhappy: `, err)
	}
}