const moment = require('moment-timezone')
const geoTz = require('geo-tz')
const EmojiLookup = require('../../emojiLookup')
const helpCommand = require('./help')
const weatherTileGenerator = require('../../weatherTileGenerator')
const Uicons = require('../../uicons')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)
		const { types: typeInfo } = client.GameData
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
		const capitalize = (word) => word.charAt(0).toUpperCase() + word.slice(1)

		const emojiLookup = new EmojiLookup(client.GameData.utilData.emojis)
		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		// Substitute aliases
		const pokemonAlias = require('../../../../config/pokemonAlias.json')
		for (let i = args.length - 1; i >= 0; i--) {
			let alias = pokemonAlias[args[i]]
			if (alias) {
				if (!Array.isArray(alias)) alias = [alias]
				args.splice(i, 1, ...alias.map((x) => x.toString()))
			}
		}

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
			case 'translate': {
				await msg.reply(`Reverse translation: ${args.map((x) => `"${x}" `)}`)
				await msg.reply(`Forward translation: ${args.map((x) => `"${translator.translate(x)}" `)}`)
				break
			}
			case 'dts': {
				if (msg.isFromAdmin) {
					let s = 'Your loaded DTS looks like this:\n'
					for (const dts of client.dts) {
						s += `type: ${dts.type} platform: ${dts.platform} id: ${dts.id} language: ${dts.language}\n`
					}

					await msg.reply(s)
				}
				break
			}

			case 'shiny': {
				if (client.PoracleInfo.lastStatsBroadcast) {
					let message = `**${translator.translate('Shiny Stats (Last few hours)')}**\n`
					const { shiny } = client.PoracleInfo.lastStatsBroadcast

					Object.entries(shiny).forEach(([pokemonId, shinyInfo]) => {
						const mon = client.GameData.monsters[`${pokemonId}_0`]
						const monName = mon ? translator.translate(mon.name) : `${translator.translate('Unknown monster')} ${pokemonId}`

						message = message.concat(`${monName}: ${translator.translate('Seen')} ${shinyInfo.seen} - ${translator.translate('Ratio')} 1:${shinyInfo.ratio.toFixed(0)}\n`)
					})

					await msg.reply(message, { style: 'markdown' })
				} else {
					await msg.reply(translator.translate('Shiny information not yet calculated - wait a few minutes and try again'))
				}
				break
			}
			case 'rarity': {
				if (client.PoracleInfo.lastStatsBroadcast) {
					let message = ''
					const { rarity } = client.PoracleInfo.lastStatsBroadcast
					// Miss out common and unseen
					for (let group = 2; group < 6; group++) {
						const monsters = rarity[group].map(
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
			case 'moves': {
				let message = `${translator.translate('Recognised moves:')}\n`
				const moveList = Object.values(client.GameData.moves).sort((a, b) => a.name.localeCompare(b.name))
				for (const move of moveList) {
					let displayText = move.name
					let translatedDisplayText = translator.translate(move.name)
					if (moveList.filter((x) => x.name === move.name).length > 1) {
						displayText += `/${move.type}`
						translatedDisplayText += `/${translator.translate(move.type)}`
					}

					message += `${displayText.replace(/ /g, '\\_')}${translatedDisplayText !== displayText ? ` or ${translatedDisplayText.replace(/ /g, '\\_')}` : ''}\n`
				}

				await msg.reply(message, { style: 'markdown' })
				break
			}
			case 'items': {
				let message = `${translator.translate('Recognised items:')}\n`
				const itemList = Object.values(client.GameData.items).map((x) => x.name).sort()
				for (const itemName of itemList) {
					const translatedName = translator.translate(itemName)
					message += `${itemName.replace(/ /g, '\\_')}${translatedName !== itemName ? ` or ${translatedName.replace(/ /g, '\\_')}` : ''}\n`
				}

				await msg.reply(message, { style: 'markdown' })
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
				let staticMap = null
				if (client.config.geocoding.staticProvider === 'tileservercache' && client.config.general.imgUrl) {
					const imgUicons = new Uicons(client.config.general.imgUrl, 'png', client.log)

					staticMap = await weatherTileGenerator.generateWeatherTile(client.query.tileserverPregen, weatherCellId, weatherId, imgUicons)
				}

				// Build forecast information

				let currentTimestamp = currentHourTimestamp
				let forecastString = `**${translator.translate('Forecast')}:**\n`
				let availableForecast = false

				// eslint-disable-next-line no-constant-condition
				while (true) {
					currentTimestamp += 3600
					const forecastInfo = weatherInfo[currentTimestamp]
					if (!forecastInfo) break

					const timeForHuman = moment.unix(currentTimestamp).tz(geoTz.find(latitude, longitude)[0].toString()).format('HH:mm')

					forecastString = forecastString.concat(timeForHuman, ' - ', translator.translate(client.GameData.utilData.weather[forecastInfo].name), ' ', translator.translate(emojiLookup.lookup(client.GameData.utilData.weather[forecastInfo].emoji, platform)), '\n')
					availableForecast = true
				}

				await msg.replyWithImageUrl(
					translator.translateFormat('Current Weather: {0} {1}', translator.translate(client.GameData.utilData.weather[weatherId].name), translator.translate(emojiLookup.lookup(client.GameData.utilData.weather[weatherId].emoji, platform))),
					availableForecast ? forecastString : translator.translate('No forecast available'),
					staticMap,
				)

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
						let message = `**${translator.translate('Available forms')}:**\n`
						found = true

						for (const form of monsters) {
							message = message.concat(`${translator.translate(form.name)} ${form.form.name ? `${translator.translate('form')}:${translator.translate(form.form.name).replace(/ /g, '\\_')}` : ''}\n`)
						}

						const mon = monsters[0]
						const typeData = client.GameData.utilData.types
						const types = mon.types.map((type) => type.name)
						const strengths = {}
						const weaknesses = {}

						message = message.concat(`\n**Pokédex ID:** ${mon.id}\n`);

						for (const type of types) {
							strengths[type] = []
							typeInfo[type].strengths.forEach((x) => {
								strengths[type].push(x.typeName)
							})
							typeInfo[type].weaknesses.forEach((x) => {
								if (!weaknesses[x.typeName]) weaknesses[x.typeName] = 1
								weaknesses[x.typeName] *= 2
							})
							typeInfo[type].resistances.forEach((x) => {
								if (!weaknesses[x.typeName]) weaknesses[x.typeName] = 1
								weaknesses[x.typeName] *= 0.5
							})
							typeInfo[type].immunes.forEach((x) => {
								if (!weaknesses[x.typeName]) weaknesses[x.typeName] = 1
								weaknesses[x.typeName] *= 0.25
							})
						}

						const typeEmojiName = (type) => `${typeData[type]
							? translator.translate(emojiLookup.lookup(typeData[type].emoji, platform))
							: ''} ${translator.translate(type)}`

						if (client.PoracleInfo.lastStatsBroadcast) {
							const { shiny } = client.PoracleInfo.lastStatsBroadcast
							if (shiny[mon.id]) {
								message = message.concat(`\n**${translator.translate('Shiny Rate')}**: ${shiny[mon.id].seen}/${shiny[mon.id].total}  (1:${shiny[mon.id].ratio.toFixed(0)})\n`)
							}
						}
						Object.entries(strengths).forEach(([name, tyepss], i) => {
							message = message.concat(`\n**${translator.translate(i ? 'Secondary Type' : 'Primary Type')}:**  ${typeEmojiName(name)}`)

							const { name: weatherName, emoji: weatherEmoji } = client.GameData.utilData.weather[Object.keys(client.GameData.utilData.weatherTypeBoost).find((weather) => client.GameData.utilData.weatherTypeBoost[weather].includes(client.GameData.utilData.types[name].id))]

							message = message.concat(`\n${translator.translate('Boosted by')}: ${translator.translate(emojiLookup.lookup(weatherEmoji, platform))} ${capitalize(translator.translate(weatherName))}`)

							if (tyepss.length) message = message.concat(`\n*${translator.translate('Super Effective Against')}:* ${tyepss.map((x) => typeEmojiName(x)).join(',  ')}\n`)
						})

						message = message.concat('\n')

						const typeObj = {
							weak: { types: [], text: 'Vulnerable to' },
							extraWeak: { types: [], text: 'Very vulnerable to' },
							resist: { types: [], text: 'Resistant to' },
							immune: { types: [], text: 'Very resistant to' },
							extraImmune: { types: [], text: 'Extremely resistant to' },
						}

						for (const [name, value] of Object.entries(weaknesses)) {
							const translated = `${typeData[name]
								? translator.translate(emojiLookup.lookup(typeData[name].emoji, platform))
								: ''} ${translator.translate(name)}`
							switch (value) {
								case 0.125: typeObj.extraImmune.types.push(translated); break
								case 0.25: typeObj.immune.types.push(translated); break
								case 0.5: typeObj.resist.types.push(translated); break
								case 2: typeObj.weak.types.push(translated); break
								case 4: typeObj.extraWeak.types.push(translated); break
								default: break
							}
						}
						for (const info of Object.values(typeObj)) {
							if (info.types.length) message = message.concat(`*${translator.translate(info.text)}:* ${info.types.join(',  ')}\n`)
						}

						if (mon.thirdMoveStardust && mon.thirdMoveCandy) {
							message = message.concat(`\n**${translator.translate('Third Move Cost')}:**\n${mon.thirdMoveCandy} ${translator.translate('Candies')}\n${new Intl.NumberFormat(language).format(mon.thirdMoveStardust)} ${translator.translate('Stardust')}\n`)
						}

						if (mon.evolutions) {
							message = message.concat(`\n**${translator.translate('Evolutions')}:**`)
							for (const evolution of mon.evolutions) {
								message = message.concat(`\n${translator.translate(`${client.GameData.monsters[`${evolution.evoId}_${evolution.id}`].name}`)} (${evolution.candyCost} ${translator.translate('Candies')})`)
								if (evolution.itemRequirement) message = message.concat(`\n- ${translator.translate('Needed Item')}: ${translator.translate(evolution.itemRequirement)}`)
								if (evolution.mustBeBuddy) message = message.concat(`\n\u2705 ${translator.translate('Must Be Buddy')}`)
								if (evolution.onlyNighttime) message = message.concat(`\n\u2705 ${translator.translate('Only Nighttime')}`)
								if (evolution.onlyDaytime) message = message.concat(`\n\u2705 ${translator.translate('Only Daytime')}`)
								if (evolution.tradeBonus) message = message.concat(`\n\u2705 ${translator.translate('Trade Bonus')}`)
								message.concat('\n')
								if (evolution.questRequirement) message = message.concat(`\n${translator.translate('Special Requirement')}: ${translator.translate(evolution.questRequirement.i18n).replace('{{amount}}', evolution.questRequirement.target)}`)
								message = message.concat('\n')
							}
						}

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
					await msg.reply(
						translator.translateFormat('Valid commands are `{0}info rarity`, `{0}info weather`, `{0}info moves`, `{0}info items`, `{0}info bulbasaur`', util.prefix),
						{ style: 'markdown' },
					)
					await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
				}
			}
		}
	} catch (err) {
		client.log.error(`info command ${msg.content} unhappy:`, err)
	}
}
