const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, args) => {
	try {
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		const monsters = await client.query.selectAllQuery('monsters', { id: target.id, profile_no: currentProfileNo })
		const raids = await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo })
		const eggs = await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo })
		const human = (await client.query.selectAllQuery('humans', { id: target.id }))[0]
		const quests = await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo })
		const invasions = await client.query.selectAllQuery('invasion', { id: target.id, profile_no: currentProfileNo })
		const lures = await client.query.selectAllQuery('lures', { id: target.id, profile_no: currentProfileNo })
		const profile = await client.query.selectOneQuery('profiles', { id: target.id, profile_no: currentProfileNo })

		const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
		if (args.includes('area')) {
			return msg.reply(`${translator.translate('You are currently set to receive alarms in')} ${human.area}`)
		}

		let message = ''
		let locationText

		if (+human.latitude !== 0 && +human.longitude !== 0) {
			locationText = `\n${translator.translate('Your location is currently set to')} ${maplink}`
		} else {
			locationText = `\n${translator.translate('You have not set a location yet')}`
		}
		await msg.reply(`${translator.translate('Your alerts are currently')} **${human.enabled ? `${translator.translate('enabled')}` : `${translator.translate('disabled')}`}**${locationText}`, { style: 'markdown' })

		if (human.area != '[]') {
			message = message.concat('\n\n', `${translator.translate('You are currently set to receive alarms in')} ${human.area}`)
		} else {
			message = message.concat('\n\n', translator.translate('You have not selected any area yet'))
		}

		if (profile) {
			message = message.concat('\n\n', `${translator.translate('Your profile is currently set to:')} ${profile.name}`)
		}
		await msg.reply(message)

		message = ''

		if (!client.config.general.disablePokemon) {
			if (monsters.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following monsters:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any monsters'))

			monsters.forEach((monster) => {
				let monsterName
				let formName

				if (monster.pokemon_id == 0) {
					monsterName = translator.translate('Everything')
					formName = ''
				} else {
					const mon = Object.values(client.GameData.monsters).find((m) => m.id === monster.pokemon_id && m.form.id === monster.form)
					if (!mon) {
						monsterName = `${translator.translate('Unknown monster')} ${monster.pokemon_id}`
						formName = `${monster.form}`
					} else {
						monsterName = mon.name
						formName = mon.form.name
						if (formName === undefined || mon.form.id === 0 && formName === 'Normal') formName = ''
					}
				}
				let miniv = monster.min_iv
				if (miniv === -1) miniv = 0

				const greatLeague = monster.great_league_ranking >= 4096 ? translator.translate('any') : `top${monster.great_league_ranking} (@${monster.great_league_ranking_min_cp}+)`
				const ultraLeague = monster.ultra_league_ranking >= 4096 ? translator.translate('any') : `top${monster.ultra_league_ranking} (@${monster.ultra_league_ranking_min_cp}+)`
				message = message.concat(`\n**${translator.translate(`${monsterName}`)}** ${translator.translate(`${formName}`)} ${monster.distance ? ` | ${translator.translate('distance')}: ${monster.distance}m` : ''} | ${translator.translate('iv')}: ${miniv}%-${monster.max_iv}% | ${translator.translate('cp')}: ${monster.min_cp}-${monster.max_cp} | ${translator.translate('level')}: ${monster.min_level}-${monster.max_level} | ${translator.translate('stats')}: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.max_atk}/${monster.max_def}/${monster.max_sta} | ${translator.translate('greatpvp')}: ${greatLeague} | ${translator.translate('ultrapvp')}: ${ultraLeague}${monster.gender ? ` | ${translator.translate('gender')}: ${client.GameData.utilData.genders[monster.gender].emoji}` : ''}${monster.min_time ? ` | ${translator.translate('minimum time:')} ${monster.min_time}s` : ''}`)
			})
		}

		if (!client.config.general.disableRaid) {
			if (raids.length || eggs.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following raids:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any raids'))
			raids.forEach((raid) => {
				const mon = Object.values(client.GameData.monsters).find((m) => m.id === raid.pokemon_id && m.form.id === raid.form)
				const monsterName = mon ? translator.translate(mon.name) : 'levelMon'
				const raidTeam = translator.translate(client.GameData.utilData.teams[raid.team].name)
				let formName = mon ? translator.translate(mon.form.name) : 'levelMonForm'
				if (!mon || formName === undefined || mon.form.id === 0 && formName === 'Normal') formName = ''

				if (+raid.pokemon_id === 9000) {
					message = message.concat(`\n**${translator.translate('level').charAt(0).toUpperCase() + translator.translate('level').slice(1)} ${raid.level} ${translator.translate('raids')}** ${raid.distance ? ` | ${translator.translate('distance')}: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''}`)
				} else {
					message = message.concat(`\n**${monsterName}**${formName ? ` ${translator.translate('form')}: ${formName}` : ''}${raid.distance ? ` | ${translator.translate('distance')}: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''}`)
				}
			})
			eggs.forEach((egg) => {
				const raidTeam = translator.translate(client.GameData.utilData.teams[egg.team].name)
				message = message.concat(`\n**${translator.translate('level').charAt(0).toUpperCase() + translator.translate('level').slice(1)} ${egg.level} ${translator.translate('eggs')}** ${egg.distance ? ` | ${translator.translate('distance')}: ${egg.distance}m` : ''} ${egg.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${egg.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''}`)
			})
		}

		if (!client.config.general.disableQuest) {
			if (quests.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following quests:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any quests'))

			quests.forEach((quest) => {
				let rewardThing = ''
				if (quest.reward_type === 7) {
					rewardThing = Object.values(client.GameData.monsters).find((m) => m.id === quest.reward).name
					rewardThing = translator.translate(rewardThing)
				}
				if (quest.reward_type === 3) rewardThing = `${quest.reward > 0 ? `${quest.reward} ${translator.translate('or more stardust')}` : `${translator.translate('stardust')}`}`
				if (quest.reward_type === 2) rewardThing = translator.translate(client.GameData.items[quest.reward].name)
				if (quest.reward_type === 12) {
					if (quest.reward == 0) {
						rewardThing = `${translator.translate('mega energy')}`
					} else {
						const mon = Object.values(client.GameData.monsters).find((m) => m.id === quest.reward && m.form.id === 0)
						const monsterName = mon ? translator.translate(mon.name) : 'energyMon'
						rewardThing = `${translator.translate('mega energy')} ${monsterName}`
					}
				}
				message = message.concat(`\n${translator.translate('reward').charAt(0).toUpperCase() + translator.translate('reward').slice(1)}: **${rewardThing}**${quest.distance ? ` | ${translator.translate('distance')}: ${quest.distance}m` : ''}`)
			})
		}

		if (!client.config.general.disablePokestop) {
			if (invasions.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following invasions:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any invasions'))

			invasions.forEach((invasion) => {
				let genderText = ''
				let typeText = ''
				if (!invasion.gender || invasion.gender === '') {
					genderText = translator.translate('any')
				} else if (invasion.gender === 1) {
					genderText = translator.translate('male')
				} else if (invasion.gender === 2) {
					genderText = translator.translate('female')
				}
				if (!invasion.grunt_type || invasion.grunt_type === '') {
					typeText = 'any'
				} else {
					typeText = invasion.grunt_type
				}
				message = message.concat(`\n${translator.translate('grunt type').charAt(0).toUpperCase() + translator.translate('grunt type').slice(1)}: **${translator.translate(typeText, true)}**${invasion.distance ? ` | ${translator.translate('distance')}: ${invasion.distance}m` : ''} | ${translator.translate('gender')}: ${genderText}`)
			})

			if (lures.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following lures:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any lures'))

			lures.forEach((lure) => {
				let typeText = ''

				if (lure.lure_id === 0) {
					typeText = 'any'
				} else {
					typeText = client.GameData.utilData.lures[lure.lure_id].name
				}
				message = message.concat(`\n${translator.translate('Lure type')}: **${translator.translate(typeText, true)}**${lure.distance ? ` | ${translator.translate('distance')}: ${lure.distance}m` : ''} `)
			})
		}

		if (message.length < 4000) {
			return await msg.reply(message, { style: 'markdown' })
		}

		try {
			const hastelink = await client.hastebin(message)
			return await msg.reply(`${translator.translate('Tracking list is quite long. Have a look at')} ${hastelink}`)
		} catch (e) {
			const filepath = path.join(__dirname, `./${target.name}.txt`)
			fs.writeFileSync(filepath, message)
			await msg.replyWithAttachment(`${translator.translate('Tracking list is long, but Hastebin is also down. ☹️ \nTracking list made into a file:')}`, filepath)
			fs.unlinkSync(filepath)
			client.log.warn('Hastebin seems down, got error: ', e)
		}
	} catch (err) {
		client.log.error(`${msg.content} command unhappy: `, err)
	}
}
