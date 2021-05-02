const helpCommand = require('./help.js')
const geofenceTileGenerator = require('../../geofenceTileGenerator')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language, currentProfileNo, targetIsAdmin,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		let availableAreas = client.geofence.map((area) => area.name)
		let lowercaseAreas = availableAreas.map((x) => x.toLowerCase())
		const human = await client.query.selectOneQuery('humans', { id: target.id })

		if (client.config.areaSecurity.enabled && !targetIsAdmin) {
			if (human.area_restriction) {
				const calculatedAreas = []

				if (human.community_membership) {
					for (const community of JSON.parse(human.community_membership)) {
						const communityName = Object.keys(client.config.areaSecurity.communities).find((x) => x.toLowerCase() == community)
						const communityDetails = communityName ? client.config.areaSecurity.communities[communityName] : null
						if (communityDetails && communityDetails.allowedAreas) {
							calculatedAreas.push(...communityDetails.allowedAreas.map((x) => x.toLowerCase()))
						}
					}

					availableAreas = availableAreas.filter((x) => calculatedAreas.includes(x.toLowerCase()))
					lowercaseAreas = availableAreas.map((x) => x.toLowerCase())
				} else {
					availableAreas = []
					lowercaseAreas = []
				}
			}
		}

		// Check target
		const confAreas = lowercaseAreas.map((area) => area.replace(/ /gi, '_')).sort()
		const confAreas2 = availableAreas.map((area) => area.replace(/ /gi, '_')).sort()
		const confUse = confAreas2.join('\n')

		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		// Remove arguments that we don't want to keep for area processing
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		const areaArgs = args.map((a) => a.replace(/ /g, '_'))
		switch (args[0]) {
			case 'add': {
				const oldArea = JSON.parse(human.area.split()).map((area) => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter((x) => areaArgs.includes(x))
				const addAreas = validAreas.filter((x) => !oldArea.includes(x))
				const newAreas = [...oldArea, ...addAreas].filter((area) => confAreas.includes(area)).map((area) => area.replace(/_/g, ' '))
				if (!validAreas.length) {
					return await msg.reply(`${translator.translate('no valid areas there, please use one of')}\n\`\`\`\n${confUse}\`\`\` `, { style: 'markdown' })
				}
				await client.query.updateQuery('humans', { area: JSON.stringify(newAreas) }, { id: target.id })

				if (addAreas.length) {
					await msg.reply(`${translator.translate('Added areas:')} ${addAreas}`)
				} else {
					await msg.react('👌')
				}
				await client.query.updateQuery('profiles', { area: JSON.stringify(newAreas) }, { id: target.id, profile_no: currentProfileNo })

				break
			}
			case 'remove': {
				const oldArea = JSON.parse(human.area.split()).map((area) => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter((x) => areaArgs.includes(x))
				const removeAreas = validAreas.filter((x) => oldArea.includes(x))
				const newAreas = [...oldArea].filter((area) => confAreas.includes(area) && !removeAreas.includes(area)).map((area) => area.replace(/_/g, ' '))
				if (!validAreas.length) {
					return await msg.reply(`${translator.translate('no valid areas there, please use one of')}\n\`\`\`\n${confUse}\`\`\` `, { style: 'markdown' })
				}
				await client.query.updateQuery('humans', { area: JSON.stringify(newAreas) }, { id: target.id })

				if (removeAreas.length) {
					await msg.reply(`${translator.translate('Removed areas:')} ${removeAreas}`)
				} else {
					await msg.react('👌')
				}

				await client.query.updateQuery('profiles', { area: JSON.stringify(newAreas) }, { id: target.id, profile_no: currentProfileNo })
				break
			}
			case 'list': {
				await msg.reply(`${translator.translate('Current configured areas are:')}\n\`\`\`\n${confUse}\`\`\` `, { style: 'markdown' })
				break
			}
			case 'overview': {
				if (client.config.geocoding.staticMapType.location && client.config.geocoding.staticProvider.toLowerCase() === 'tileservercache') {
					const staticMap = await geofenceTileGenerator.generateGeofenceOverviewTile(
						client.geofence,
						client.query.tileserverPregen,
						args,
					)
					if (staticMap) {
						await msg.replyWithImageUrl(translator.translateFormat('Overview display'),
							null,
							staticMap)
					}
				}
				break
			}
			case 'show': {
				if (client.config.geocoding.staticMapType.location && client.config.geocoding.staticProvider.toLowerCase() === 'tileservercache') {
					for (const area of args) {
						let staticMap

						if (area.match(client.re.dRe)) {
							if (+human.latitude == 0 || +human.longitude == 0) {
								await msg.reply(translator.translate('You have not set a location yet'))
							} else {
								const [, , distance] = area.match(client.re.dRe)
								staticMap = await geofenceTileGenerator.generateDistanceTile(
									client.query.tileserverPregen,
									human.latitude,
									human.longitude,
									distance,
								)
							}
						} else {
							staticMap = await geofenceTileGenerator.generateGeofenceTile(
								client.geofence,
								client.query.tileserverPregen,
								area,
							)
						}

						if (staticMap) {
							await msg.replyWithImageUrl(translator.translateFormat('Area display: {0}', area),
								null,
								staticMap)
						}
					}
				}
				break
			}
			default: {
				await msg.reply(`${translator.translate('You are currently set to receive alarms in')} ${human.area}`)

				await msg.reply(translator.translateFormat('Valid commands are `{0}area list`, `{0}area add <areaname>`, `{0}area remove <areaname>`', util.prefix),
					{ style: 'markdown' })
				await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)

				break
			}
		}
	} catch (err) {
		client.log.error(`area command ${msg.content} unhappy:`, err)
	}
}
