const moment = require('moment-timezone')
const geoTz = require('geo-tz')
const pokeTypes = require('poke-types')
const EmojiLookup = require('../../emojiLookup')
const helpCommand = require('./help')
const weatherTileGenerator = require('../../weatherTileGenerator')

function capitalize(s) {
	if (typeof s !== 'string') return ''
	s = s.replace(/_/gi, ' ').toLowerCase()
	return s.charAt(0).toUpperCase() + s.slice(1)
}

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

		const emojiLookup = new EmojiLookup(client.GameData.utilData.emojis)
		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		switch (args[0]) {
			case 'poracle': {
				if (msg.isFromAdmin) {
					if (client.PoracleInfo.status) {
						await msg.reply(`Queue info: ${client.PoracleInfo.status.queueInfo}\nQueue summary: ${JSON.stringify(client.PoracleInfo.status.queueSummary, null, ' ')}\nCache info: ${client.PoracleInfo.status.cacheInfo}`)
					} else {
						await msg.reply('Status information not yet warmed up')
					}

					const format = (seconds) => {
						const pad = (s) => ((s < 10 ? '0' : '') + s)

						const days = Math.floor(seconds / (24 * 60 * 60))
						const hours = Math.floor(seconds % (24 * 60 * 60) / (60 * 60))
						const minutes = Math.floor(seconds % (60 * 60) / 60)
						seconds = Math.floor(seconds % 60)

						return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
					}

					await msg.reply(`Poracle has been up for ${format(process.uptime())}`)
				}
				break
			}

			case 'rarity': {
				if (client.PoracleInfo.lastStatsBroadcast) {
					let message = ''
					// Miss out common and unseen
					for (let group = 2; group < 6; group++) {
						const monsters = client.PoracleInfo.lastStatsBroadcast[group].map(
							(x) => {
								const mon = Object.values(client.GameData.monsters).find((m) => m.id === x && m.form.id === 0)
								if (!mon) {
									return `${translator.translate('Unknown monster')} ${x}`
								}
								return translator.translate(mon.name)
							},
						)
						message = message.concat(`**${translator.translate(client.GameData.utilData.rarity[group])}**: ${monsters.join(', ')}`, '\n')
					}

					await msg.reply(message, { style: 'markdown' })
				} else {
					await msg.reply(translator.translate('Rarity information not yet calculated - wait a few minutes and try again'))
				}
				break
			}

			case 'weather': {
				if (!client.PoracleInfo.lastWeatherBroadcast) {
					return msg.reply(translator.translate('Weather information is not yet available - wait a few minutes and try again'))
				}

				let latitude; let
					longitude

				if (args.length > 1) {
					const matches = args[1].match(client.re.latlonRe)
					if (matches !== null && matches.length >= 2) {
						latitude = parseFloat(matches[1])
						longitude = parseFloat(matches[2])
					} else {
						return msg.reply(translator.translateFormat('Could not understand the location'), { style: 'markdown' })
					}
				} else {
					const human = await client.query.selectOneQuery('humans', { id: target.id })

					latitude = human.latitude
					longitude = human.longitude
					if (!longitude || !latitude) {
						return msg.reply(translator.translateFormat('You have not set your location, use `!{0}{1}`', util.prefix, translator.translate('help')), { style: 'markdown' })
					}
				}
				const weatherCellId = weatherTileGenerator.getWeatherCellId(latitude, longitude)
				const weatherInfo = client.PoracleInfo.lastWeatherBroadcast[weatherCellId]

				const nowTimestamp = Math.floor(Date.now() / 1000)
				const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)

				if (!weatherInfo || !weatherInfo[currentHourTimestamp]) {
					return msg.reply(translator.translate('No weather information is available for this location'))
				}

				const weatherId = weatherInfo[currentHourTimestamp]
				const staticMap = await weatherTileGenerator.generateWeatherTile(client.query.tileserverPregen, weatherCellId, weatherId)

				// Build forecast information

				let currentTimestamp = currentHourTimestamp
				let forecastString = `**${translator.translate('Forecast')}:**\n`
				let availableForecast = false

				// eslint-disable-next-line no-constant-condition
				while (true) {
					currentTimestamp += 3600
					const forecastInfo = weatherInfo[currentTimestamp]
					if (!forecastInfo) break

					const timeForHuman = moment.unix(currentTimestamp).tz(geoTz(latitude, longitude).toString()).format('HH:mm')

					forecastString = forecastString.concat(timeForHuman, ' - ', translator.translate(client.GameData.utilData.weather[forecastInfo].name), ' ', translator.translate(emojiLookup.lookup(client.GameData.utilData.weather[forecastInfo].emoji, platform)), '\n')
					availableForecast = true
				}

				await msg.replyWithImageUrl(translator.translateFormat('Current Weather: {0} {1}', translator.translate(client.GameData.utilData.weather[weatherId].name), translator.translate(emojiLookup.lookup(client.GameData.utilData.weather[weatherId].emoji, platform))),
					availableForecast ? forecastString : translator.translate('No forecast available'),
					staticMap)

				break
			}

			default: {
				let found = false
				if (args.length >= 1) {
					const formArgs = args.filter((arg) => arg.match(client.re.formRe))
					const formNames = formArgs ? formArgs.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.match(client.re.formRe)[2], true).toLowerCase()) : []

					const monsters = Object.values(client.GameData.monsters).filter((mon) => (args[0] === mon.name.toLowerCase() || args[0] === mon.id.toString())
						&& (!formNames.length || formNames.includes(mon.form.name.toLowerCase())))

					if (monsters.length) {
						let message = `*${translator.translate('Available forms')}:*\n`
						found = true

						for (const form of monsters) {
							message = message.concat(`${translator.translate(form.name)} ${form.form.name ? `${translator.translate('form')}:${translator.translate(form.form.name).replace(/ /g, '\\_')}` : ''}\n`)
						}

						const mon = monsters[0]
						const typeData = client.GameData.utilData.types
						const types = mon.types.map((type) => type.name)
						const typeString = mon.types.map((type) => `${translator.translate(emojiLookup.lookup(typeData[type.name].emoji, platform))} ${translator.translate(type.name)}`)
						const allWeakness = pokeTypes.getTypeWeaknesses.apply(null, types)
						const allStrength = {}
						const superEffective = []
						const ultraEffective = []
						const superWeakness = []
						const ultraWeakness = []

						types.forEach((type) => {
							const strengths = pokeTypes.getTypeStrengths(type)
							Object.keys(strengths).forEach((t) => {
								if (strengths[t] > allStrength[t] || !allStrength[t]) allStrength[t] = strengths[t]
							})
						})

						for (const type of Object.keys(allStrength)) {
							const capType = capitalize(type)
							if (allStrength[type] === 2) superEffective.push(`${typeData[capType] ? translator.translate(emojiLookup.lookup(typeData[capType].emoji, platform)) : ''} ${translator.translate(capType)}`)
							if (allStrength[type] > 2) ultraEffective.push(`${typeData[capType] ? translator.translate(emojiLookup.lookup(typeData[capType].emoji, platform)) : ''} ${translator.translate(capType)}`)
						}

						for (const type of Object.keys(allWeakness)) {
							const capType = capitalize(type)
							if (allWeakness[type] === 2) superWeakness.push(`${typeData[capType] ? translator.translate(emojiLookup.lookup(typeData[capType].emoji, platform)) : ''} ${translator.translate(capType)}`)
							if (allWeakness[type] > 2) ultraWeakness.push(`${typeData[capType] ? translator.translate(emojiLookup.lookup(typeData[capType].emoji, platform)) : ''} ${translator.translate(capType)}`)
						}

						message = message.concat(`\n*${translator.translate('Type')}*: ${typeString}\n`)

						const boosted = Object.entries(client.GameData.utilData.weatherTypeBoost).filter(([, weatherTypes]) => weatherTypes.some((t) => mon.types.map((t2) => t2.id).includes(t))).map(([weather]) => `${translator.translate(emojiLookup.lookup(client.GameData.utilData.weather[weather].emoji, platform))} ${translator.translate(client.GameData.utilData.weather[weather].name)}`)

						if (boosted.length) message = message.concat(`*${translator.translate('Boosted by')}:* ${boosted.join(', ')}\n`)

						if (superWeakness.length) message = message.concat(`*${translator.translate('Weak against')}*: ${superWeakness.join(', ')}\n`)
						if (ultraWeakness.length) message = message.concat(`*${translator.translate('Very weak against')}*: ${ultraWeakness.join(', ')}\n`)
						if (superEffective.length) message = message.concat(`*${translator.translate('Strong against')}*: ${superEffective.join(', ')}\n`)
						if (ultraEffective.length) message = message.concat(`*${translator.translate('Very strong against')}*: ${ultraEffective.join(', ')}\n`)

						message = message.concat('\n💯:\n')
						for (const level of [15, 20, 25, 40, 50]) {
							const cpMulti = client.GameData.utilData.cpMultipliers[level]
							const atk = mon.stats.baseAttack
							const def = mon.stats.baseDefense
							const sta = mon.stats.baseStamina

							const cp = Math.max(10, Math.floor(
								(15 + atk)
								* (15 + def) ** 0.5
								* (15 + sta) ** 0.5
								* cpMulti ** 2
								/ 10,
							))
							message = message.concat(`${translator.translateFormat('Level {0} CP {1}', level, cp)}\n`)
						}

						await msg.reply(message, { style: 'markdown' })
					}
				}

				if (!found) {
					await msg.reply(translator.translateFormat('Valid commands are `{0}info rarity`, `{0}info weather`, `{0}info bulbasaur`', util.prefix),
						{ style: 'markdown' })
					await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
				}
			}
		}
	} catch (err) {
		client.log.error(`info command ${msg.content} unhappy:`, err)
	}
}
