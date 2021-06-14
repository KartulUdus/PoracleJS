const fs = require('fs')
const path = require('path')
const helpCommand = require('./help.js')

function monsterRowText(translator, GameData, monster) {
	let monsterName
	let formName

	if (monster.pokemon_id == 0) {
		monsterName = translator.translate('Everything')
		formName = ''
	} else {
		const mon = Object.values(GameData.monsters).find((m) => m.id === monster.pokemon_id && m.form.id === monster.form)
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
	if (miniv === -1) miniv = '?'
	let minRarity = monster.rarity
	if (minRarity === -1) minRarity = 1

	const greatLeague = monster.great_league_ranking >= 4096 ? translator.translate('any') : `top${monster.great_league_ranking} (@${monster.great_league_ranking_min_cp}+)`
	const ultraLeague = monster.ultra_league_ranking >= 4096 ? translator.translate('any') : `top${monster.ultra_league_ranking} (@${monster.ultra_league_ranking_min_cp}+)`
	return `**${translator.translate(`${monsterName}`)}** ${translator.translate(`${formName}`)} ${monster.distance ? ` | ${translator.translate('distance')}: ${monster.distance}m` : ''} | ${translator.translate('iv')}: ${miniv}%-${monster.max_iv}% | ${translator.translate('cp')}: ${monster.min_cp}-${monster.max_cp} | ${translator.translate('level')}: ${monster.min_level}-${monster.max_level} | ${translator.translate('stats')}: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.max_atk}/${monster.max_def}/${monster.max_sta} | ${translator.translate('greatpvp')}: ${greatLeague} | ${translator.translate('ultrapvp')}: ${ultraLeague}${(monster.rarity > 0 || monster.max_rarity < 6) ? ` | ${translator.translate('rarity')}: ${translator.translate(GameData.utilData.rarity[minRarity])}-${translator.translate(GameData.utilData.rarity[monster.max_rarity])}` : ''}${monster.gender ? ` | ${translator.translate('gender')}: ${GameData.utilData.genders[monster.gender].emoji}` : ''}${monster.min_time ? ` | ${translator.translate('minimum time:')} ${monster.min_time}s` : ''}`
}

function raidRowText(translator, GameData, raid) {
	const mon = Object.values(GameData.monsters).find((m) => m.id === raid.pokemon_id && m.form.id === raid.form)
	const monsterName = mon ? translator.translate(mon.name) : 'levelMon'
	const raidTeam = translator.translate(GameData.utilData.teams[raid.team].name)
	let formName = mon ? translator.translate(mon.form.name) : 'levelMonForm'
	if (!mon || formName === undefined || mon.form.id === 0 && formName === 'Normal') formName = ''

	if (+raid.pokemon_id === 9000) {
		return `**${translator.translate('level').charAt(0).toUpperCase() + translator.translate('level').slice(1)} ${raid.level} ${translator.translate('raids')}** ${raid.distance ? ` | ${translator.translate('distance')}: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''}`
	}

	return `**${monsterName}**${formName ? ` ${translator.translate('form')}: ${formName}` : ''}${raid.distance ? ` | ${translator.translate('distance')}: ${raid.distance}m` : ''}${raid.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''}`
}

function nestRowText(translator, GameData, nest) {
	let monsterName
	let formName

	if (nest.pokemon_id == 0) {
		monsterName = translator.translate('Everything')
		formName = ''
	} else {
		const mon = Object.values(GameData.monsters).find((m) => m.id === nest.pokemon_id && m.form.id === nest.form)
		monsterName = mon ? translator.translate(mon.name) : 'levelMon'
		formName = mon ? translator.translate(mon.form.name) : 'levelMonForm'
		if (!mon || formName === undefined || mon.form.id === 0 && formName === 'Normal') formName = ''
	}

	return `**${monsterName}**${formName ? ` ${translator.translate('form')}: ${formName}` : ''}${nest.distance ? ` | ${translator.translate('distance')}: ${nest.distance}m` : ''} ${nest.min_spawn_avg ? translator.translateFormat('Min avg. spawn {0}/hour', nest.min_spawn_avg) : ''}`
}

function eggRowText(translator, GameData, egg) {
	const raidTeam = translator.translate(GameData.utilData.teams[egg.team].name)
	return `**${translator.translate('level').charAt(0).toUpperCase() + translator.translate('level').slice(1)} ${egg.level} ${translator.translate('eggs')}** ${egg.distance ? ` | ${translator.translate('distance')}: ${egg.distance}m` : ''} ${egg.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${egg.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''}`
}

function questRowText(translator, GameData, quest) {
	let rewardThing = ''
	if (quest.reward_type === 7) {
		const monster = Object.values(GameData.monsters).find((m) => m.id === quest.reward)
		if (monster) {
			rewardThing = translator.translate(monster.name)
		} else {
			rewardThing = `${translator.translate('Unknown monster')} ${quest.reward}`
		}
	}
	if (quest.reward_type === 3) rewardThing = `${quest.reward > 0 ? `${quest.reward} ${translator.translate('or more stardust')}` : `${translator.translate('stardust')}`}`
	if (quest.reward_type === 2) {
		if (GameData.items[quest.reward]) {
			rewardThing = translator.translate(GameData.items[quest.reward].name)
		} else {
			rewardThing = `${translator.translate('Unknown item')} ${quest.reward}`
		}
	}
	if (quest.reward_type === 12) {
		if (quest.reward == 0) {
			rewardThing = `${translator.translate('mega energy')}`
		} else {
			const mon = Object.values(GameData.monsters).find((m) => m.id === quest.reward && m.form.id === 0)
			const monsterName = mon ? translator.translate(mon.name) : 'energyMon'
			rewardThing = `${translator.translate('mega energy')} ${monsterName}`
		}
	}
	return `${translator.translate('reward').charAt(0).toUpperCase() + translator.translate('reward').slice(1)}: **${rewardThing}**${quest.distance ? ` | ${translator.translate('distance')}: ${quest.distance}m` : ''}`
}

function invasionRowText(translator, GameData, invasion) {
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
	return `${translator.translate('grunt type')
		.charAt(0)
		.toUpperCase() + translator.translate('grunt type')
		.slice(1)}: **${translator.translate(typeText, true)}**${invasion.distance ? ` | ${translator.translate('distance')}: ${invasion.distance}m` : ''} | ${translator.translate('gender')}: ${genderText}`
}

function lureRowText(translator, GameData, lure) {
	let typeText = ''

	if (lure.lure_id === 0) {
		typeText = 'any'
	} else {
		typeText = GameData.utilData.lures[lure.lure_id].name
	}
	return `${translator.translate('Lure type')}: **${translator.translate(typeText, true)}**${lure.distance ? ` | ${translator.translate('distance')}: ${lure.distance}m` : ''} `
}

exports.monsterRowText = monsterRowText
exports.raidRowText = raidRowText
exports.eggRowText = eggRowText
exports.questRowText = questRowText
exports.invasionRowText = invasionRowText
exports.nestRowText = nestRowText
exports.lureRowText = lureRowText

exports.run = async (client, msg, args, options) => {
	try {
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		const monsters = await client.query.selectAllQuery('monsters', { id: target.id, profile_no: currentProfileNo })
		const raids = await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo })
		const eggs = await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo })
		const human = (await client.query.selectAllQuery('humans', { id: target.id }))[0]
		const quests = await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo })
		const invasions = await client.query.selectAllQuery('invasion', { id: target.id, profile_no: currentProfileNo })
		const lures = await client.query.selectAllQuery('lures', { id: target.id, profile_no: currentProfileNo })
		const nests = await client.query.selectAllQuery('nests', { id: target.id, profile_no: currentProfileNo })
		const profile = await client.query.selectOneQuery('profiles', { id: target.id, profile_no: currentProfileNo })

		const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
		if (args.includes('area')) {
			return msg.reply(`${translator.translate('You are currently set to receive alarms in')} ${human.area}`)
		}

		let message = ''
		let locationText
		let adminExplanation = ''
		let restartExplanation = ''
		if (msg.isFromAdmin) {
			adminExplanation = `Tracking details for **${msg.convertSafe(target.name)}**\n`
		}

		if (+human.latitude !== 0 && +human.longitude !== 0) {
			locationText = `\n${translator.translate('Your location is currently set to')} ${maplink}`
		} else {
			locationText = `\n${translator.translate('You have not set a location yet')}`
		}
		if (!human.enabled) {
			restartExplanation = `\n${translator.translateFormat('You can start receiving alerts again using `{0}{1}`', util.prefix, translator.translate('start'))}`
		}
		await msg.reply(`${adminExplanation}${translator.translate('Your alerts are currently')} **${human.enabled ? `${translator.translate('enabled')}` : `${translator.translate('disabled')}`}**${restartExplanation}${locationText}`, { style: 'markdown' })

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
				message = message.concat('\n', monsterRowText(translator, client.GameData, monster))
			})
		}

		if (!client.config.general.disableRaid) {
			if (raids.length || eggs.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following raids:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any raids'))
			raids.forEach((raid) => {
				message = message.concat('\n', raidRowText(translator, client.GameData, raid))
			})
			eggs.forEach((egg) => {
				message = message.concat('\n', eggRowText(translator, client.GameData, egg))
			})
		}

		if (!client.config.general.disableQuest) {
			if (quests.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following quests:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any quests'))

			quests.forEach((quest) => {
				message = message.concat('\n', questRowText(translator, client.GameData, quest))
			})
		}

		if (!client.config.general.disablePokestop) {
			if (!client.config.general.disableInvasion) {
				if (invasions.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following invasions:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any invasions'))

				invasions.forEach((invasion) => {
					message = message.concat('\n', invasionRowText(translator, client.GameData, invasion))
				})
			}

			if (!client.config.general.disableLure) {
				if (lures.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following lures:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any lures'))

				lures.forEach((lure) => {
					message = message.concat('\n', lureRowText(translator, client.GameData, lure))
				})
			}
		}

		if (!client.config.general.disableNest) {
			if (nests.length) {
				message = message.concat('\n\n', translator.translate('You\'re tracking the following nests:'), '\n')
			} else message = message.concat('\n\n', translator.translate('You\'re not tracking any nests'))

			nests.forEach((nest) => {
				message = message.concat('\n', nestRowText(translator, client.GameData, nest))
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
