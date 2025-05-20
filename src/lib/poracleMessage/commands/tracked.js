const fs = require('fs')
const path = require('path')
const helpCommand = require('./help')

function standardText(config, translator, row) {
	let text = ''
	if (row.template !== config.general.defaultTemplateName.toString()) {
		text = text.concat(` ${translator.translate('template')}: ${row.template}`)
	}

	if (row.clean) {
		text = text.concat(` ${translator.translate('clean')}`)
	}

	return text
}

function monsterRowText(config, translator, GameData, monster) {
	let monsterName
	let formName

	if (monster.pokemon_id === 0) {
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

	let minSize = monster.size
	if (minSize < 1) minSize = 1

	const pvpString = monster.pvp_ranking_league
		? translator.translate('pvp ranking:').concat(
			' ',
			{
				500: translator.translate('littlepvp'),
				1500: translator.translate('greatpvp'),
				2500: translator.translate('ultrapvp'),
			}[monster.pvp_ranking_league].toString(),
			` top${monster.pvp_ranking_best > 1 ? `${monster.pvp_ranking_best}-` : ''}${monster.pvp_ranking_worst} (@${monster.pvp_ranking_min_cp}+${monster.pvp_ranking_cap ? ` ${translator.translate('level cap:')}${monster.pvp_ranking_cap}` : ''})`,
		)
		: ''

	return `**${translator.translate(`${monsterName}`)}** ${translator.translate(`${formName}`)} ${monster.distance ? ` | ${translator.translate('distance')}: ${monster.distance}m` : ''} | ${translator.translate('iv')}: ${miniv}%-${monster.max_iv}% | ${translator.translate('cp')}: ${monster.min_cp}-${monster.max_cp} | ${translator.translate('level')}: ${monster.min_level}-${monster.max_level} | ${translator.translate('stats')}: ${monster.atk}/${monster.def}/${monster.sta} - ${monster.max_atk}/${monster.max_def}/${monster.max_sta}${pvpString ? ` | ${pvpString}` : ''}${(monster.size > 0 || monster.max_size < 6) ? ` | ${translator.translate('size')}: ${translator.translate(GameData.utilData.size[minSize])}-${translator.translate(GameData.utilData.size[monster.max_size])}` : ''}${(monster.rarity > 0 || monster.max_rarity < 6) ? ` | ${translator.translate('rarity')}: ${translator.translate(GameData.utilData.rarity[minRarity])}-${translator.translate(GameData.utilData.rarity[monster.max_rarity])}` : ''}${monster.gender ? ` | ${translator.translate('gender')}: ${GameData.utilData.genders[monster.gender].emoji}` : ''}${monster.min_time ? ` | ${translator.translate('minimum time:')} ${monster.min_time}s` : ''} ${standardText(config, translator, monster)}`
}

async function raidRowText(config, translator, GameData, raid, scannerQuery) {
	const mon = Object.values(GameData.monsters).find((m) => m.id === raid.pokemon_id && m.form.id === raid.form)
	const monsterName = mon ? translator.translate(mon.name) : 'levelMon'
	const raidTeam = translator.translate(GameData.utilData.teams[raid.team].name)
	let formName = mon ? translator.translate(mon.form.name) : 'levelMonForm'
	if (!mon || formName === undefined || mon.form.id === 0 && formName === 'Normal') formName = ''

	let gymNameText = null
	if (raid.gym_id) gymNameText = scannerQuery ? await scannerQuery.getGymName(raid.gym_id) || raid.gym_id : raid.gym_id

	let rsvpText = ''
	switch (raid.rsvp_changes) {
		case 0:	rsvpText = translator.translate('without rsvp updates')
			break
		case 1: rsvpText = translator.translate('including rsvp updates')
			break
		case 2: rsvpText = translator.translate('rsvp only')
			break
		default: break
	}
	const moveName = raid.move !== 9000 && GameData.moves[raid.move] ? `${translator.translate(GameData.moves[raid.move].name)}/${translator.translate(GameData.moves[raid.move].type)}` : ''

	if (+raid.pokemon_id === 9000) {
		return `**${raid.level === 90 ? translator.translate('All level') : `${translator.translate('level').charAt(0).toUpperCase() + translator.translate('level').slice(1)} ${raid.level}`} ${translator.translate('raids')}** ${raid.distance ? ` | ${translator.translate('distance')}: ${raid.distance}m` : ''}${moveName ? ` | ${translator.translate('with move')} ${moveName}` : ''}${raid.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''} ${standardText(config, translator, raid)}${raid.gym_id ? ` ${translator.translate('at gym ')} ${gymNameText}` : ''} ${rsvpText}`
	}

	return `**${monsterName}**${formName ? ` ${translator.translate('form')}: ${formName}` : ''}${raid.distance ? ` | ${translator.translate('distance')}: ${raid.distance}m` : ''}${moveName ? ` | ${translator.translate('with move')} ${moveName}` : ''}${raid.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${raid.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''} ${standardText(config, translator, raid)}${raid.gym_id ? ` ${translator.translate('at gym ')} ${gymNameText}` : ''} ${rsvpText}`
}

async function gymRowText(config, translator, GameData, gym, scannerQuery) {
	const raidTeam = (gym.team === 4) ? translator.translate('All team\'s') : translator.translate(GameData.utilData.teams[gym.team].name)

	let gymNameText = null
	if (gym.gym_id) gymNameText = scannerQuery ? await scannerQuery.getGymName(gym.gym_id) || gym.gym_id : gym.gym_id

	return `**${raidTeam} ${translator.translate('gyms')}**${gym.distance ? ` | ${translator.translate('distance')}: ${gym.distance}m` : ''}${gym.slot_changes ? ` | ${translator.translate('including slot changes')}` : ''}${gym.battle_changes ? ` | ${translator.translate('including battle changes')}` : ''} ${standardText(config, translator, gym)}${gym.gym_id ? ` ${translator.translate('at gym ')} ${gymNameText}` : ''}`
}

function nestRowText(config, translator, GameData, nest) {
	let monsterName
	let formName

	if (nest.pokemon_id === 0) {
		monsterName = translator.translate('Everything')
		formName = ''
	} else {
		const mon = Object.values(GameData.monsters).find((m) => m.id === nest.pokemon_id && m.form.id === nest.form)
		monsterName = mon ? translator.translate(mon.name) : 'levelMon'
		formName = mon ? translator.translate(mon.form.name) : 'levelMonForm'
		if (!mon || formName === undefined || mon.form.id === 0 && formName === 'Normal') formName = ''
	}

	return `**${monsterName}**${formName ? ` ${translator.translate('form')}: ${formName}` : ''}${nest.distance ? ` | ${translator.translate('distance')}: ${nest.distance}m` : ''} ${nest.min_spawn_avg ? translator.translateFormat('Min avg. spawn {0}/hour', nest.min_spawn_avg) : ''} ${standardText(config, translator, nest)}`
}

async function eggRowText(config, translator, GameData, egg, scannerQuery) {
	const raidTeam = translator.translate(GameData.utilData.teams[egg.team].name)

	let gymNameText = null
	if (egg.gym_id) gymNameText = scannerQuery ? await scannerQuery.getGymName(egg.gym_id) || egg.gym_id : egg.gym_id

	let rsvpText = ''
	switch (egg.rsvp_changes) {
		case 0:	rsvpText = translator.translate('without rsvp updates')
			break
		case 1: rsvpText = translator.translate('including rsvp updates')
			break
		case 2: rsvpText = translator.translate('rsvp only')
			break
		default: break
	}

	return `**${egg.level === 90 ? translator.translate('All level') : `${translator.translate('level').charAt(0).toUpperCase() + translator.translate('level').slice(1)} ${egg.level}`} ${translator.translate('eggs')}** ${egg.distance ? ` | ${translator.translate('distance')}: ${egg.distance}m` : ''} ${egg.team === 4 ? '' : ` | ${translator.translate('controlled by')} ${raidTeam}`}${egg.exclusive ? ` | ${translator.translate('must be an EX Gym')}` : ''} ${standardText(config, translator, egg)}${egg.gym_id ? ` ${translator.translate('at gym ')} ${gymNameText}` : ''} ${rsvpText}`
}

function questRowText(config, translator, GameData, quest) {
	let rewardThing = ''
	if (quest.reward_type === 7) {
		const monster = Object.values(GameData.monsters).find((m) => m.id === quest.reward && m.form.id === quest.form)
		if (monster) {
			rewardThing = translator.translate(monster.name)
			if (quest.form && monster.form.name) {
				rewardThing = rewardThing.concat(` ${translator.translate(monster.form.name)}`)
			}
		} else {
			rewardThing = `${translator.translate('Unknown monster')} ${quest.reward} ${quest.form}`
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
		if (quest.reward === 0) {
			rewardThing = `${translator.translate('mega energy')}`
		} else {
			const mon = Object.values(GameData.monsters).find((m) => m.id === quest.reward && m.form.id === 0)
			const monsterName = mon ? translator.translate(mon.name) : `[energy] ${translator.translate('Unknown monster')} ${quest.reward}`
			rewardThing = `${translator.translate('mega energy')} ${monsterName}`
		}
	}

	if (quest.reward_type === 4) {
		if (quest.reward === 0) {
			rewardThing = `${translator.translate('candy')}`
		} else {
			const mon = Object.values(GameData.monsters).find((m) => m.id === quest.reward && m.form.id === 0)
			const monsterName = mon ? translator.translate(mon.name) : `[candy] ${translator.translate('Unknown monster')} ${quest.reward}`
			rewardThing = `${translator.translate('candy')} ${monsterName}`
		}
	}
	return `${translator.translate('reward').charAt(0).toUpperCase() + translator.translate('reward').slice(1)}: **${rewardThing}**${quest.amount > 0 ? ` ${translator.translate('minimum')} ${quest.amount}` : ''}${quest.distance ? ` | ${translator.translate('distance')}: ${quest.distance}m` : ''} ${standardText(config, translator, quest)}`
}

function invasionRowText(config, translator, GameData, invasion) {
	let genderText = ''
	let typeText
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
		.slice(1)}: **${translator.translate(typeText, true)}**${invasion.distance ? ` | ${translator.translate('distance')}: ${invasion.distance}m` : ''} | ${translator.translate('gender')}: ${genderText} ${standardText(config, translator, invasion)}`
}

function lureRowText(config, translator, GameData, lure) {
	let typeText

	if (lure.lure_id === 0) {
		typeText = 'any'
	} else {
		typeText = GameData.utilData.lures[lure.lure_id].name
	}
	return `${translator.translate('Lure type')}: **${translator.translate(typeText, true)}**${lure.distance ? ` | ${translator.translate('distance')}: ${lure.distance}m` : ''} ${standardText(config, translator, lure)}`
}

function fortUpdateRowText(config, translator, GameData, fortUpdate) {
	return `${translator.translate('Fort updates')}: **${translator.translate(fortUpdate.fort_type, true)}**${fortUpdate.distance ? ` | ${translator.translate('distance')}: ${fortUpdate.distance}m` : ''} ${fortUpdate.change_types}${fortUpdate.include_empty ? ' including empty changes' : ''} ${standardText(config, translator, fortUpdate)}`
}

function currentAreaText(translator, geofence, areas) {
	if (areas.length) {
		return `${translator.translate('You are currently set to receive alarms in')} ${geofence.filter((x) => areas.includes(x.name.toLowerCase())).map((x) => x.name).join(', ')}`
	}
	return translator.translate('You have not selected any area yet')
}

exports.monsterRowText = monsterRowText
exports.raidRowText = raidRowText
exports.eggRowText = eggRowText
exports.questRowText = questRowText
exports.invasionRowText = invasionRowText
exports.nestRowText = nestRowText
exports.lureRowText = lureRowText
exports.gymRowText = gymRowText
exports.fortUpdateRowText = fortUpdateRowText
exports.currentAreaText = currentAreaText

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

		if (!await util.commandAllowed(commandName)) {
			await msg.react('🚫')
			return msg.reply(translator.translate('You do not have permission to execute this command'))
		}

		const monsters = await client.query.selectAllQuery('monsters', { id: target.id, profile_no: currentProfileNo })
		const raids = await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo })
		const eggs = await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo })
		const human = (await client.query.selectAllQuery('humans', { id: target.id }))[0]
		const quests = await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo })
		const invasions = await client.query.selectAllQuery('invasion', { id: target.id, profile_no: currentProfileNo })
		const lures = await client.query.selectAllQuery('lures', { id: target.id, profile_no: currentProfileNo })
		const nests = await client.query.selectAllQuery('nests', { id: target.id, profile_no: currentProfileNo })
		const gyms = await client.query.selectAllQuery('gym', { id: target.id, profile_no: currentProfileNo })
		const forts = await client.query.selectAllQuery('forts', { id: target.id, profile_no: currentProfileNo })
		const profile = await client.query.selectOneQuery('profiles', { id: target.id, profile_no: currentProfileNo })

		const blocked = human.blocked_alerts ? JSON.parse(human.blocked_alerts) : []

		const maplink = `https://maps.google.com/maps?q=${human.latitude},${human.longitude}`
		if (args.includes('area')) {
			return msg.reply(currentAreaText(translator, client.geofence.geofence, JSON.parse(human.area)))
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

		message = message.concat('\n\n', currentAreaText(translator, client.geofence.geofence, JSON.parse(human.area)))

		if (profile) {
			message = message.concat('\n\n', `${translator.translate('Your profile is currently set to:')} ${profile.name}`)
		}
		await msg.reply(message)

		message = ''

		if (!client.config.general.disablePokemon) {
			if (blocked.includes('monster')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track monsters'))
			} else {
				if (monsters.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following monsters:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any monsters'))

				monsters.forEach((monster) => {
					message = message.concat('\n', monsterRowText(client.config, translator, client.GameData, monster))
				})

				if (blocked.includes('pvp')) {
					message = message.concat('\n', translator.translate('Your permission level means you will not get results from PVP tracking'))
				}
			}
		}

		if (!client.config.general.disableRaid) {
			if (blocked.includes('raid')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track raids'))
			} else if (blocked.includes('egg')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track eggs'))
			} else {
				if (raids.length || eggs.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following raids:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any raids'))
				for (const raid of raids) {
					message = message.concat('\n', await raidRowText(client.config, translator, client.GameData, raid, client.scannerQuery))
				}
				for (const egg of eggs) {
					message = message.concat('\n', await eggRowText(client.config, translator, client.GameData, egg, client.scannerQuery))
				}
			}
		}

		if (!client.config.general.disableQuest) {
			if (blocked.includes('quest')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track quests'))
			} else {
				if (quests.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following quests:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any quests'))

				for (const quest of quests) {
					message = message.concat('\n', questRowText(client.config, translator, client.GameData, quest))
				}
			}
		}

		if (!client.config.general.disablePokestop) {
			if (blocked.includes('invasion')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track invasions'))
			} else if (!client.config.general.disableInvasion) {
				if (invasions.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following invasions:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any invasions'))

				invasions.forEach((invasion) => {
					message = message.concat('\n', invasionRowText(client.config, translator, client.GameData, invasion))
				})
			}

			if (!client.config.general.disableLure) {
				if (blocked.includes('lure')) {
					message = message.concat('\n\n', translator.translate('You do not have permission to track lures'))
				} else {
					if (lures.length) {
						message = message.concat('\n\n', translator.translate('You\'re tracking the following lures:'), '\n')
					} else message = message.concat('\n\n', translator.translate('You\'re not tracking any lures'))

					lures.forEach((lure) => {
						message = message.concat('\n', lureRowText(client.config, translator, client.GameData, lure))
					})
				}
			}
		}

		if (!client.config.general.disableNest) {
			if (blocked.includes('nest')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track nests'))
			} else {
				if (nests.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following nests:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any nests'))

				nests.forEach((nest) => {
					message = message.concat('\n', nestRowText(client.config, translator, client.GameData, nest))
				})
			}
		}

		if (!client.config.general.disableGym) {
			if (blocked.includes('gym')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track gyms'))
			} else {
				if (gyms.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following gyms:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any gyms'))

				for (const gym of gyms) {
					message = message.concat('\n', await gymRowText(client.config, translator, client.GameData, gym, client.scannerQuery))
				}
			}
		}

		if (!client.config.general.disableFortUpdate) {
			if (blocked.includes('forts')) {
				message = message.concat('\n\n', translator.translate('You do not have permission to track fort changes'))
			} else {
				if (forts.length) {
					message = message.concat('\n\n', translator.translate('You\'re tracking the following fort changes:'), '\n')
				} else message = message.concat('\n\n', translator.translate('You\'re not tracking any fort changes'))

				forts.forEach((fort) => {
					message = message.concat('\n', fortUpdateRowText(client.config, translator, client.GameData, fort))
				})
			}
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
