const helpCommand = require('./help')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
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

		const profiles = await client.query.selectAllQuery('profiles', { id: target.id })

		// Remove arguments that we don't want to keep for area processing
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		switch (args[0]) {
			case 'add': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })

				const name = args[1]
				if (!name || name === 'all') {
					await msg.react('🙅')
					await msg.reply(translator.translate('That is not a valid profile name'))
					return
				}
				if (profiles.some((x) => x.name.toLowerCase() === name)) {
					await msg.react('🙅')
					await msg.reply(translator.translate('That profile name already exists'))
					return
				}
				let newProfileNo = 1
				let retry
				do {
					retry = false

					for (const profile of profiles) {
						if (profile.profile_no === newProfileNo) {
							newProfileNo++
							retry = true
						}
					}
				} while (retry)

				await client.query.insertQuery('profiles', {
					id: target.id,
					profile_no: newProfileNo,
					name,
					area: human.area,
					latitude: human.latitude,
					longitude: human.longitude,
					active_hours: '{}',
				})
				await msg.react('✅')

				break
			}

			case 'remove': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				const name = args[1]

				if (!name) {
					await msg.react('🙅')
					await msg.reply(translator.translate('That is not a valid profile name'))
					return
				}

				let profileNo = parseInt(args[1], 10)

				if (profileNo) {
					if (!profiles.some((x) => x.profile_no === profileNo)) {
						await msg.react('🙅')
						await msg.reply(translator.translate('That is not a valid profile number'))
					}
				} else {
					const profile = profiles.find((x) => x.name.toLowerCase() === name)
					if (!profile) {
						await msg.react('🙅')
						await msg.reply(translator.translate('That is not a valid profile name'))
						return
					}
					profileNo = profile.profile_no
				}

				await client.query.deleteQuery(
					'profiles',
					{
						id: target.id,
						profile_no: profileNo,
					},
				)

				if (profiles.length !== 1 || profileNo !== 1) {
					await client.query.deleteQuery('egg', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('monsters', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('raid', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('quest', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('lures', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('forts', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('gym', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('invasion', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('nests', { id: target.id, profile_no: profileNo })
					await client.query.deleteQuery('weather', { id: target.id, profile_no: profileNo })
				}

				if (human.current_profile_no === profileNo) {
					// Find lowest profile (or 1)

					let lowestProfileNo = 9999
					let lowestProfile
					for (const profile of profiles) {
						if (profile.profile_no < lowestProfileNo && profile.profile_no !== profileNo) {
							lowestProfileNo = profile.profile_no
							lowestProfile = profile
						}
					}
					if (!lowestProfile) {
						await client.query.updateQuery(
							'humans',
							{
								current_profile_no: 1,
							},
							{ id: target.id },
						)
					} else {
						await client.query.updateQuery(
							'humans',
							{
								current_profile_no: lowestProfileNo,
								area: lowestProfile.area,
								latitude: lowestProfile.latitude,
								longitude: lowestProfile.longitude,
							},
							{ id: target.id },
						)
					}
				}

				await msg.react('✅')

				break
			}

			case 'list': {
				if (!profiles.length) {
					await msg.reply(translator.translate('You do not have any profiles'))
				} else {
					let response = ''
					for (const profile of profiles) {
						let timeString = ''
						if (profile.active_hours.length > 3) {
							const times = JSON.parse(profile.active_hours)
							const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

							for (const t of times) {
								timeString = timeString.concat(`    ${translator.translate(dayNames[t.day - 1])} ${t.hours}:${`00${t.mins}`.slice(-2)}\n`)
							}
						}

						response = response.concat(`${profile.profile_no}${profile.profile_no === currentProfileNo ? '*' : '.'} ${profile.name}${profile.area !== '[]' ? ` - ${translator.translate('areas')}: ${profile.area}` : ''}${profile.latitude ? ` - ${translator.translate('location')}: ${profile.latitude.toFixed(5)},${profile.longitude.toFixed(5)}` : ''}\n${timeString}`)
					}
					await msg.reply(`${translator.translate('Currently configured profiles are:')}\n${response}`)
				}
				break
			}
			case 'settime': {
				const timeArray = []
				if (args[1]) {
					// day number 1-7, Monday is 1, Sunday is 7, per ISO
					const daysRe = [client.re.monRe, client.re.tueRe,
						client.re.wedRe, client.re.thuRe, client.re.friRe, client.re.satRe, client.re.sunRe,
						client.re.weekdayRe, client.re.weekendRe]

					for (const element of args) {
						for (let day = 0; day < 9; day++) {
							const match = element.match(daysRe[day])
							if (match) {
								let hours = match[3]; let mins = match[5]

								if (!hours) {
									hours = 0
								}
								if (!mins) {
									mins = 0
								}
								if (day < 7) {
									timeArray.push({
										day: day + 1,
										hours,
										mins,
									})
								}
								if (day === 7) {
									for (const d of [1, 2, 3, 4, 5]) {
										timeArray.push({
											day: d,
											hours,
											mins,
										})
									}
								}
								if (day === 8) {
									for (const d of [6, 7]) {
										timeArray.push({
											day: d,
											hours,
											mins,
										})
									}
								}
							}
						}
					}
				}

				await client.query.updateQuery('profiles', { active_hours: JSON.stringify(timeArray) }, { id: target.id, profile_no: currentProfileNo })

				await msg.react('✅')

				break
			}
			case 'copyto': {
				const currentName = profiles.find((profile) => profile.profile_no === currentProfileNo).name
				const categories = ['monsters', 'raid', 'egg', 'quest', 'invasion', 'weather', 'lures', 'gym', 'nests', 'forts']
				const valid = []
				const invalid = []

				for (const arg of args) {
					if ((arg === 'all' || profiles.some((profile) => profile.name === arg)) && currentName !== arg) {
						valid.push(arg)
					} else if (arg !== 'copyto') {
						invalid.push(arg)
					}
				}
				for (const category of categories) {
					const tempBackup = await client.query.selectAllQuery(category, { id: target.id, profile_no: currentProfileNo })
					for (const profile of profiles) {
						if (profile.profile_no !== currentProfileNo && (valid.includes(profile.name) || valid.includes('all'))) {
							if (!valid.includes(profile.name)) valid.push(profile.name)
							await client.query.deleteQuery(category, { id: target.id, profile_no: profile.profile_no })
							await client.query.insertQuery(category, tempBackup.map((x) => ({ ...x, profile_no: profile.profile_no, uid: undefined })))
						}
					}
				}
				let message = ''
				if (valid.length) {
					await msg.react('✅')
					message = message.concat(translator.translate('Current profile copied to: '), valid.filter((x) => x !== 'all').join(', '), '.')
					if (valid.includes('all')) message = message.concat(translator.translate(' (all)'))
				} else {
					await msg.react('🙅')
				}
				if (invalid.length) {
					message = message.concat(translator.translate('\nThese profiles were invalid: '), invalid.join(', '), '.')
					if (invalid.includes(currentName)) message = message.concat(translator.translate('\nCannot copy over the currently active profile.'))
				}
				await msg.reply(message, { style: 'markdown' })
			} break
			default: {
				if (args.length === 0) {
					const profile = profiles.find((x) => x.profile_no === currentProfileNo)
					if (!profile) {
						await msg.reply(translator.translate('You don\'t have a profile set'))
					} else {
						await msg.reply(`${translator.translate('Your profile is currently set to:')} ${profile.name}`)
					}

					await msg.reply(
						translator.translateFormat('Valid commands are `{0}profile <name>`, `{0}profile list`, `{0}profile add <name>`, `{0}profile remove <name>`, `{0}profile settime <timestring>`, `{0}profile copyto <name>`', util.prefix),
						{ style: 'markdown' },
					)

					await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
					return
				}

				let profileNo = parseInt(args[0], 10)
				let valid = false
				let profile
				if (!profileNo) {
					profile = profiles.find((x) => x.name.toLowerCase() === args[0])
					if (profile) {
						profileNo = profile.profile_no
						valid = true
					}
				} else {
					profile = profiles.find((x) => x.profile_no === profileNo)
					if (profile) valid = true
				}

				if (!valid) {
					await msg.react(translator.translate('🙅'))
					return await msg.reply(translator.translate('I can\'t find that profile'))
				}

				await client.query.updateQuery(
					'humans',
					{
						current_profile_no: profileNo,
						area: profile.area,
						latitude: profile.latitude,
						longitude: profile.longitude,
					},
					{ id: target.id },
				)
				await msg.react('✅')
			}
		}
	} catch (err) {
		client.log.error(`profile command ${msg.content} unhappy:`, err)
	}
}
