const path = require('path')
const fs = require('fs')
const helpCommand = require('./help')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language,
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

		if (!args.length) {
			await msg.reply(
				translator.translateFormat('Valid commands are e.g. `{0}script everything`, `{0}script pokemon raids eggs quest lures invasion nests gym forts`, `{0}script everything allprofiles`, `{0}script everything link`', util.prefix),
				{ style: 'markdown' },
			)
			return
		}

		const human = (await client.query.selectOneQuery('humans', { id: target.id }))

		const profiles = await client.query.selectAllQuery('profiles', { id: target.id })

		// should allow user to override prefix
		const { prefix } = util
		// select everything for noew
		const everything = args.includes('everything')

		let message = ''

		const addProfile = async (currentProfileNo) => {
			const monsters = await client.query.selectAllQuery('monsters', {
				id: target.id,
				profile_no: currentProfileNo,
			})
			const raids = await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo })
			const eggs = await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo })
			const quests = await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo })
			const invasions = await client.query.selectAllQuery('invasion', {
				id: target.id,
				profile_no: currentProfileNo,
			})
			const lures = await client.query.selectAllQuery('lures', { id: target.id, profile_no: currentProfileNo })
			const nests = await client.query.selectAllQuery('nests', { id: target.id, profile_no: currentProfileNo })
			const gyms = await client.query.selectAllQuery('gym', { id: target.id, profile_no: currentProfileNo })
			const forts = await client.query.selectAllQuery('forts', { id: target.id, profile_no: currentProfileNo })

			const gender = ['', 'male', 'female', 'genderless']

			if (everything || args.includes('pokemon')) {
				const monsterParameters = {
					iv: ['min_iv', -1],
					maxiv: ['max_iv', 100],
					mincp: ['min_cp', 0],
					macxp: ['max_cp', 9000],
					level: ['min_level', 0],
					maxlevel: ['max_level', 55],
					atk: ['atk', 0],
					def: ['def', 0],
					sta: ['sta', 0],
					maxatk: ['max_atk', 15],
					maxsta: ['max_sta', 15],
					maxdef: ['max_def', 15],
					weight: ['min_weight', 0],
					maxweight: ['max_weight', 9000000],
					rarity: ['rarity', -1],
					maxrarity: ['max_rarity', 6],
					t: ['min_time', 0],
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}
				for (const monster of monsters) {
					const mon = client.GameData.monsters[`${monster.pokemon_id}_${monster.form}`]

					message += `${prefix}track ${monster.pokemon_id ? mon.name.replace(/ /g, '_') : 'everything'}`
					if (monster.form) message += ` form:${mon.form.name.replace(/ /g, '_')}`

					for (const [param, [dbFieldName, defaultValue]] of Object.entries(monsterParameters)) {
						if (monster[dbFieldName] !== defaultValue) message += ` ${param}:${monster[dbFieldName]}`
					}

					if (monster.clean) message += ' clean'
					if (monster.gender) message += ` ${gender[monster.gender]}`

					if (monster.pvp_ranking_league) {
						const leagues = {
							500: 'little',
							1500: 'great',
							2500: 'ultra',
						}
						const leagueName = leagues[monster.pvp_ranking_league]
						message += ` ${leagueName}:${monster.pvp_ranking_worst} ${leagueName}cp:${monster.pvp_ranking_min_cp}`
						if (monster.pvp_ranking_best > 1) message += ` ${leagueName}high:${monster.pvp_ranking_best}`
					}
					// league

					message += '\n'
				}
			}

			if (everything || args.includes('raids')) {
				const raidParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}
				const raidTeams = ['harmony', 'mystic', 'valour', 'instinct']

				for (const raid of raids) {
					message += `${prefix}raid `
					if (raid.pokemon_id === 9000) {
						message += `level:${raid.level}`
					} else {
						const mon = client.GameData.monsters[`${raid.pokemon_id}_${raid.form}`]

						message += `${mon.name}`
						if (raid.form) message += ` form:${mon.form.name}` // will not work
					}
					for (const [param, [dbFieldName, defaultValue]] of Object.entries(raidParameters)) {
						if (raid[dbFieldName] !== defaultValue) message += ` ${param}:${raid[dbFieldName]}`
					}
					if (raid.team !== 4) message += ` team:${raidTeams[raid.team]}`
					if (raid.exclusive) message += ' ex'
					if (raid.rsvp_changes == 1) message += ' rsvp'
					if (raid.rsvp_changes == 2) message += ' rsvp_only'
					if (raid.clean) message += ' clean'

					message += '\n'
				}
			}

			if (everything || args.includes('eggs')) {
				const eggParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}
				const raidTeams = ['harmony', 'mystic', 'valour', 'instinct']

				for (const egg of eggs) {
					message += `${prefix}egg level:${egg.level}`

					for (const [param, [dbFieldName, defaultValue]] of Object.entries(eggParameters)) {
						if (egg[dbFieldName] !== defaultValue) message += ` ${param}:${egg[dbFieldName]}`
					}
					if (egg.team !== 4) message += ` team:${raidTeams[egg.team]}`
					if (egg.exclusive) message += ' ex'
					if (egg.rsvp_changes == 1) message += ' rsvp'
					if (egg.rsvp_changes == 2) message += ' rsvp_only'
					if (egg.clean) message += ' clean'

					message += '\n'
				}
			}

			if (everything || args.includes('invasion')) {
				const invasionParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}

				for (const invasion of invasions) {
					message += `${prefix}invasion ${invasion.grunt_type.replace(/ /g, '_')}`
					if (invasion.gender) message += ` ${gender[invasion.gender]}`
					for (const [param, [dbFieldName, defaultValue]] of Object.entries(invasionParameters)) {
						if (invasion[dbFieldName] !== defaultValue) message += ` ${param}:${invasion[dbFieldName]}`
					}
					if (invasion.clean) message += ' clean'
				}
			}

			if (everything || args.includes('quest')) {
				const questParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}
				for (const quest of quests) {
					message += `${prefix}quest`
					switch (quest.reward_type) {
						case 3: {
							if (quest.reward) message += ` stardust:${quest.reward}`
							else message += ' stardust'
							break
						}
						case 12: {
							if (quest.reward) {
								const mon = client.GameData.monsters[`${quest.reward}_0`]
								message += ` energy:${mon.name.replace(/ /g, '_')}`
							} else message += ' energy'
							break
						}
						case 4: {
							if (quest.reward) {
								const mon = client.GameData.monsters[`${quest.reward}_0`]
								message += ` candy:${mon.name.replace(/ /g, '_')}`
							} else message += ' candy'
							break
						}
						case 7: {
							const mon = client.GameData.monsters[`${quest.reward}_${quest.form}`]
							message += ` ${mon.name.replace(/ /g, '_')}`
							if (quest.form) {
								message += ` form:${mon.form.name.replace(/ /g, '_')}`
							}
							break
						}
						case 2: {
							message += ` ${client.GameData.items[quest.reward].name.replace(/ /g, '_')}`
							break
						}
						default:
							break
					}

					if (quest.shiny) message += ' shiny'
					for (const [param, [dbFieldName, defaultValue]] of Object.entries(questParameters)) {
						if (quest[dbFieldName] !== defaultValue) message += ` ${param}:${quest[dbFieldName]}`
					}

					if (quest.clean) message += ' clean'

					message += '\n'
				}
			}

			if (everything || args.includes('gym')) {
				const gymParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}
				const teamNames = ['uncontested', 'mystic', 'valor', 'instinct']
				for (const gym of gyms) {
					message += `${prefix}gym ${teamNames[gym.team]}`

					if (gym.slot_changes) message += ' slot_changes'
					if (gym.battle_changes) message += ' battle_changes'
					for (const [param, [dbFieldName, defaultValue]] of Object.entries(gymParameters)) {
						if (gym[dbFieldName] !== defaultValue) message += ` ${param}:${gym[dbFieldName]}`
					}

					if (gym.clean) message += ' clean'

					message += '\n'
				}
			}

			if (everything || args.includes('forts')) {
				const fortParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}
				for (const fort of forts) {
					message += `${prefix}fort ${fort.fort_type}`

					if (fort.include_empty) message += ' include_empty'
					for (const [param, [dbFieldName, defaultValue]] of Object.entries(fortParameters)) {
						if (fort[dbFieldName] !== defaultValue) message += ` ${param}:${fort[dbFieldName]}`
					}

					message += '\n'
				}
			}

			if (everything || args.includes('lures')) {
				const lureParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					d: ['distance', 0],
				}

				const lureTypes = {
					0: 'everything',
					501: 'normal',
					502: 'glacial',
					503: 'mossy',
					504: 'magnetic',
					505: 'rainy',
					506: 'sparkly',
				}

				for (const lure of lures) {
					message += `${prefix}lure ${lureTypes[lure.lure_id]}`

					for (const [param, [dbFieldName, defaultValue]] of Object.entries(lureParameters)) {
						if (lure[dbFieldName] !== defaultValue) message += ` ${param}:${lure[dbFieldName]}`
					}

					if (lure.clean) message += ' clean'

					message += '\n'
				}
			}

			if (everything || args.includes('nests')) {
				const nestParameters = {
					template: ['template', client.config.general.defaultTemplateName.toString()],
					minspawn: ['min_spawn_avg', 0],
					d: ['distance', 0],
				}
				for (const nest of nests) {
					const mon = client.GameData.monsters[`${nest.pokemon_id}_0`]

					message += `${prefix}nest ${nest.pokemon_id ? mon.name.replace(/ /g, '_') : 'everything'}`

					for (const [param, [dbFieldName, defaultValue]] of Object.entries(nestParameters)) {
						if (nest[dbFieldName] !== defaultValue) message += ` ${param}:${nest[dbFieldName]}`
					}

					if (nest.clean) message += ' clean'
					message += '\n'
				}
			}
		}

		if 	(args.includes('allprofiles')) {
			for (const profile of profiles) {
				const currentProfileNo = profile.profile_no

				message += `${prefix}profile add ${profile.name}\n`
				message += `${prefix}profile ${profile.name}\n`

				if (profile.latitude) message += `${prefix}location ${profile.latitude},${profile.longitude}\n`
				const areas = JSON.parse(profile.area)
				if (areas.length) message += `${prefix}area add ${areas.map((x) => x.replace(/ /g, '_')).join(' ')}\n`

				await addProfile(currentProfileNo)
			}
		} else {
			await addProfile(human.current_profile_no)
		}

		if (!message.length) {
			return await msg.reply(translator.translate('The script specified is empty'))
		}

		if (args.includes('link')) {
			try {
				const hastelink = await client.hastebin(message)
				return await msg.reply(`${translator.translate('Your backup is at')} ${hastelink}`)
			} catch (e) {
				await msg.reply(translator.translate('Hastebin seems down'))
			}
		}

		const filepath = path.join(__dirname, `./${target.name}.txt`)
		fs.writeFileSync(filepath, message)
		await msg.replyWithAttachment(translator.translate('Your backup'), filepath)
		fs.unlinkSync(filepath)
	} catch (err) {
		client.log.error(`profile command ${msg.content} unhappy:`, err)
	}
}
