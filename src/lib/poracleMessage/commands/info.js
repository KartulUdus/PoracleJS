const helpCommand = require('./help.js')

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

			default: {
				await msg.reply('Info... about stuff')
				await msg.react('✅')
			}
		}
	} catch (err) {
		client.log.error(`info command ${msg.content} unhappy:`, err)
	}
}
