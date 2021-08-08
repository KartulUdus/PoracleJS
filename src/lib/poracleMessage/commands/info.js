const moment = require('moment-timezone')
const geoTz = require('geo-tz')
const EmojiLookup = require('../../emojiLookup')
const helpCommand = require('./help')
const weatherTileGenerator = require('../../weatherTileGenerator')

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
				let forecastString = `**${translator.translate('Forecast:')}**\n`
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
				if (args.length === 1) {
					const monsters = Object.values(client.GameData.monsters).filter((mon) => args[0] === mon.name.toLowerCase() || args[0] === mon.id.toString())
					if (monsters) {
						let message = ''
						found = true

						for (const form of monsters) {
							message = message.concat(`${form.name} ${form.form.name ? `form:${form.form.name.replace(/ /g, '_')}` : ''}\n`)
						}

						const monster = monsters[0]

						for (const level of [20, 25, 40, 50]) {
							const cpMulti = client.GameData.utilData.cpMultipliers[level]
							const atk = monster.stats.baseAttack
							const def = monster.stats.baseDefense
							const sta = monster.stats.baseStamina

							const cp = Math.max(10, Math.floor(
								(15 + atk)
								* (15 + def) ** 0.5
								* (15 + sta) ** 0.5
								* cpMulti ** 2
								/ 10,
							))
							message = message.concat(`Level ${level} CP ${cp}\n`)
						}

						await msg.reply(message)
					}
				}

				if (!found) {
					await msg.reply(translator.translateFormat('Valid commands are `{0}info rarity`, `{0}info weather`', util.prefix),
						{ style: 'markdown' })
					await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
				}
			}
		}
	} catch (err) {
		client.log.error(`info command ${msg.content} unhappy:`, err)
	}
}
