const moment = require('moment-timezone')
const geoTz = require('geo-tz')

const helpCommand = require('./help.js')
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

		switch (args[0]) {
			case 'poracle': {
				if (client.PoracleInfo.status) {
					await msg.reply(`Queue info: ${client.PoracleInfo.status.queueInfo}\nCache info: ${client.PoracleInfo.status.cacheInfo}`)
				} else {
					await msg.reply('Status information not yet warmed up')
				}
				break
			}

			case 'rarity': {
				await msg.reply('Rarity info')
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
								return mon.name
							},
						)
						message = message.concat(`*${translator.translate(client.GameData.utilData.rarity[group])}*: ${monsters.join(', ')}`, '\n')
					}

					await msg.reply(message)
				} else {
					await msg.reply('Rarity information not yet calculated')
				}
				break
			}

			case 'weather': {
				await msg.reply('Weather info')

				if (!client.PoracleInfo.lastWeatherBroadcast) {
					return msg.reply('Weather information has not yet been received')
				}

				const human = await client.query.selectOneQuery('humans', { id: target.id })

				const { latitude, longitude } = human
				const weatherCellId = weatherTileGenerator.getWeatherCellId(latitude, longitude)
				const weatherInfo = client.PoracleInfo.lastWeatherBroadcast[weatherCellId]

				const nowTimestamp = Math.floor(Date.now() / 1000)
				const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)

				if (!weatherInfo || !weatherInfo[currentHourTimestamp]) {
					return msg.reply('No weather information is available for this location')
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

					forecastString = forecastString.concat(timeForHuman, ' - ', translator.translate(client.GameData.utilData.weather[weatherId].name), ' ', translator.translate(client.GameData.utilData.weather[weatherId].emoji), '\n')
					availableForecast = true
				}

				await msg.replyWithImageUrl(translator.translateFormat('Current Weather: {0} {1}', translator.translate(client.GameData.utilData.weather[weatherId].name), translator.translate(client.GameData.utilData.weather[weatherId].emoji)),
					availableForecast ? forecastString : translator.translate('No forecast available'),
					staticMap)

				break
			}

			default: {
				await msg.reply('Info... about stuff')
				await msg.react('✅')
			}
		}
	} catch (err) {
		client.log.error(`info command ${msg.content} unhappy:`, err)
	}
}
