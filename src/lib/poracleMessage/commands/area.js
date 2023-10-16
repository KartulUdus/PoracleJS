const helpCommand = require('./help')
const geofenceTileGenerator = require('../../geofenceTileGenerator')
const trackedCommand = require('./tracked')

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

		if (!await util.commandAllowed(commandName)) {
			await msg.react('🚫')
			return msg.reply(translator.translate('You do not have permission to execute this command'))
		}

		let selectableGeofence = client.geofence.geofence
		// Note for Poracle admins we don't remove the userSelectable items
		// But we do apply the filtering later based on the user/channel that is the target (targetIsAdmin used instead)
		if (!msg.isFromAdmin) selectableGeofence = selectableGeofence.filter((area) => area.userSelectable ?? true)

		let availableAreas = selectableGeofence.map((area) => ({
			name: area.name,
			group: area.group || '',
			description: area.description,
			lowerCaseName: area.name.toLowerCase(),
		}))

		availableAreas.sort((a, b) => {
			const compare = a.group.localeCompare(b.group)
			if (compare === 0) return a.name.localeCompare(b.name)
			return compare
		})

		// let lowercaseAreas = availableAreas.map((x) => x.toLowerCase())
		const human = await client.query.selectOneQuery('humans', { id: target.id })

		if (client.config.areaSecurity.enabled && !targetIsAdmin) {
			if (human.area_restriction) {
				const calculatedAreas = []

				if (human.community_membership) {
					for (const community of JSON.parse(human.community_membership)) {
						const communityName = Object.keys(client.config.areaSecurity.communities).find((x) => x.toLowerCase() === community)
						const communityDetails = communityName ? client.config.areaSecurity.communities[communityName] : null
						if (communityDetails && communityDetails.allowedAreas) {
							calculatedAreas.push(...communityDetails.allowedAreas.map((x) => x.toLowerCase()))
						}
					}

					availableAreas = availableAreas.filter((x) => calculatedAreas.includes(x.lowerCaseName))
					// lowercaseAreas = availableAreas.map((x) => x.toLowerCase())
				} else {
					availableAreas = []
					// lowercaseAreas = []
				}
			}
		}

		// Remove arguments that we don't want to keep for area processing
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		//		const areaArgs = args.map((a) => a.replace(/ /g, '_'))
		switch (args[0]) {
			case 'add': {
				const oldArea = JSON.parse(human.area)

				args.shift()
				const addAreas = availableAreas.filter((x) => args.includes(x.lowerCaseName.replace(/_/g, ' ')))
				const areasNotAlreadyInList = addAreas.filter((x) => !oldArea.includes(x.lowerCaseName))
				const newAreas = [...oldArea, ...areasNotAlreadyInList.map((x) => x.lowerCaseName)]
					// remove invalid entries
					.filter((x) => availableAreas.some((y) => y.lowerCaseName === x))

				const uniqueNewAreas = [...new Set(newAreas)]

				if (!addAreas.length) {
					await msg.reply(
						translator.translateFormat('No valid areas. Use `{0}{1} list`', util.prefix, translator.translate('area')),
						{ style: 'markdown' },
					)
				}

				await client.query.updateQuery('humans', { area: JSON.stringify(uniqueNewAreas) }, { id: target.id })

				if (areasNotAlreadyInList.length) {
					await msg.reply(`${translator.translate('Added areas:')} ${areasNotAlreadyInList.map((x) => x.name).join(', ')}`)
				}
				await msg.reply(trackedCommand.currentAreaText(translator, client.geofence.geofence, uniqueNewAreas))

				await client.query.updateQuery('profiles', { area: JSON.stringify(uniqueNewAreas) }, {
					id: target.id,
					profile_no: currentProfileNo,
				})

				break
			}
			case 'remove': {
				const oldArea = JSON.parse(human.area)

				args.shift()
				const removeAreas = availableAreas.filter((x) => args.includes(x.lowerCaseName.replace(/_/g, ' ')))
				const removeAreasPresent = removeAreas.filter((x) => oldArea.includes(x.lowerCaseName))

				const newAreas = oldArea
					.filter((x) => !removeAreas.some((y) => y.lowerCaseName === x))
					.filter((x) => availableAreas.some((y) => y.lowerCaseName === x))

				const uniqueNewAreas = [...new Set(newAreas)]

				if (!removeAreas.length) {
					await msg.reply(
						translator.translateFormat('No valid areas. Use `{0}{1} list`', util.prefix, translator.translate('area')),
						{ style: 'markdown' },
					)
				}

				await client.query.updateQuery('humans', { area: JSON.stringify(uniqueNewAreas) }, { id: target.id })

				if (removeAreasPresent.length) {
					await msg.reply(`${translator.translate('Removed areas:')} ${removeAreasPresent.map((x) => x.name).join(', ')}`)
				}
				await msg.reply(trackedCommand.currentAreaText(translator, client.geofence.geofence, uniqueNewAreas))

				await client.query.updateQuery('profiles', { area: JSON.stringify(uniqueNewAreas) }, { id: target.id, profile_no: currentProfileNo })
				break
			}
			case 'list': {
				let confUse = translator.translate('Current configured areas are:').concat('\n```\n')
				let currentGroup = ''
				const maxLen = msg.maxLength - 10

				for (const area of availableAreas) {
					if (currentGroup !== area.group) {
						currentGroup = area.group
						if ((currentGroup.length + confUse.length) > maxLen) {
							confUse += '```'
							await msg.reply(confUse, { style: 'markdown' })
							confUse = '```\n'
						}
						confUse += `${currentGroup}\n`
					}
					const areaDisplayName = area.name.replace(/ /g, '_')
					const areaDisplayLine = `   ${areaDisplayName}${area.userSelectable === false ? '\uD83D\uDEAB' : ''}${area.description ? ` - ${area.description}` : ''}\n`

					if ((areaDisplayLine.length + confUse.length) > maxLen) {
						confUse += '```'
						await msg.reply(confUse, { style: 'markdown' })
						confUse = '```\n'
					}
					confUse += areaDisplayLine
				}

				confUse += '```'

				await msg.reply(confUse, { style: 'markdown' })

				break
			}
			case 'overview': {
				if (client.config.geocoding.staticProvider.toLowerCase() === 'tileservercache') {
					const staticMap = await geofenceTileGenerator.generateGeofenceOverviewTile(
						client.geofence.geofence,
						client.query.tileserverPregen,
						args.length >= 2 ? args : JSON.parse(human.area),
					)
					if (staticMap) {
						await msg.replyWithImageUrl(
							translator.translateFormat('Overview display'),
							null,
							staticMap,
						)
					}
				}
				break
			}
			case 'show': {
				if (client.config.geocoding.staticProvider.toLowerCase() === 'tileservercache') {
					const areas = args.length >= 2 ? args : JSON.parse(human.area)
					for (const area of areas) {
						let staticMap

						if (area.match(client.re.dRe)) {
							if (+human.latitude === 0 || +human.longitude === 0) {
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
								client.geofence.geofence,
								client.query.tileserverPregen,
								area,
							)
						}

						if (staticMap) {
							await msg.replyWithImageUrl(
								translator.translateFormat('Area display: {0}', area),
								null,
								staticMap,
							)
						}
					}
				}
				break
			}
			default: {
				await msg.reply(trackedCommand.currentAreaText(translator, client.geofence.geofence, JSON.parse(human.area)))

				await msg.reply(
					translator.translateFormat('Valid commands are `{0}area list`, `{0}area add <areaname>`, `{0}area remove <areaname>`', util.prefix),
					{ style: 'markdown' },
				)
				await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)

				break
			}
		}
	} catch (err) {
		client.log.error(`area command ${msg.content} unhappy:`, err)
	}
}
