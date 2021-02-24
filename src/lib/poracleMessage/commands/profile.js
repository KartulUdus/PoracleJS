exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const translator = client.translatorFactory.Translator(language)

		const profiles = await client.query.selectAllQuery('profiles', { id: target.id })

		// Remove arguments that we don't want to keep for area processing
		for (let i = 0; i < args.length; i++) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		switch (args[0]) {
			case 'add': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })

				const name = args[1]
				if (!name) {
					await msg.reply(translator.translate('That is not a valid profile name'))
					return
				}
				if (profiles.some((x) => x.name == name)) {
					await msg.reply(translator.translate('That profile name already exists'))
					return
				}
				let newProfileNo = 1
				let retry
				do {
					retry = false

					for (const profile of profiles) {
						if (profile.profile_no == newProfileNo) {
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
				const profileNo = parseInt(args[1], 10)
				let result

				if (profileNo) {
					result = await client.query.deleteQuery('profiles',
						{
							id: target.id,
							profile_no: profileNo,
						})
				} else {
					result = await client.query.deleteQuery('profiles',
						{
							id: target.id,
							name: args[1],
						})
				}
				const reaction = result || client.config.database.client === 'sqlite3' ? '✅' : '🙅'
				await msg.react(reaction)

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
								timeString = timeString.concat(`    ${translator.translate(dayNames[t.day-1])} ${t.hours}:${t.mins}\n`)
							}
						}

						response = response.concat(`${profile.profile_no}. ${profile.name} - areas: ${profile.area} - ${profile.latitude} ${profile.longitude}\n${timeString}`)
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
								if (day == 7) {
									for (const d of [1, 2, 3, 4, 5]) {
										timeArray.push({
											day: d,
											hours,
											mins,
										})
									}
								}
								if (day == 8) {
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

			default: {
				if (args.length == 0) {
					const profile = profiles.find((x) => x.profile_no === currentProfileNo)
					if (!profile) {
						return await msg.reply(translator.translate('You don\'t have a profile set'))
					}
					return await msg.reply(`${translator.translate('Your profile is currently set to:')} ${profile.name}`)
				}

				let profileNo = parseInt(args[0], 10)
				let valid = false
				let profile
				if (!profileNo) {
					profile = profiles.find((x) => x.name === args[0])
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

				await client.query.updateQuery('humans',
					{
						current_profile_no: profileNo,
						area: profile.area,
						latitude: profile.latitude,
						longitude: profile.longitude,
					}, { id: target.id })
				await msg.react('✅')
			}
		}
	} catch (err) {
		client.log.error(`profile command ${msg.content} unhappy:`, err)
	}
}
