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

		if (args.length === 0) {
			await msg.reply(
				translator.translateFormat('Valid commands are e.g. `{0}location <lat>,<lon>`, `{0}location <your address>`', util.prefix),
				{ style: 'markdown' },
			)
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		// Remove arguments that we don't want to keep for area processing
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		const search = args.join(' ')

		let lat
		let lon
		let placeConfirmation = ''
		let staticMap
		let message
		let remove = false

		if (args.length === 1 && args[0] === 'remove') {
			remove = true
			lat = 0
			lon = 0
		} else {
			const matches = search.match(client.re.latlonRe)
			if (matches !== null && matches.length >= 2) {
				lat = parseFloat(matches[1])
				lon = parseFloat(matches[2])
			} else {
				if (args.length === 1 && search.match(/^\d{1,5}$/) === null) {
					await msg.react(translator.translate('🙅'))
					return await msg.reply(`${translator.translate('Oops, you need to specify more than just a city name to locate accurately your position')}`)
				}
				const locations = await client.query.geolocate(search)
				if (locations === undefined || locations.length === 0) {
					return await msg.react(translator.translate('🙅'))
				}
				lat = locations[0].latitude
				lon = locations[0].longitude
				placeConfirmation = locations[0].city ? ` **${locations[0].city} - ${locations[0].country}** ` : ` **${locations[0].country}** `
			}

			if (client.config.areaSecurity.enabled && !msg.isFromAdmin) {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				if (human.area_restriction) {
					const allowedFences = JSON.parse(human.area_restriction)
					const areas = client.query.pointInArea([lat, lon])

					if (!allowedFences.some((x) => areas.includes(x))) {
						await msg.reply(translator.translate('This location is not your permitted area'))
						await msg.react('🙅')
						return
					}
				}
			}
		}

		if (remove) {
			message = translator.translateFormat('I have removed {0}\'s  location', target.name)
		} else {
			const maplink = `https://maps.google.com/maps?q=${lat},${lon}`
			message = `👋, ${translator.translate('I set ')}${target.name}${translator.translate('\'s location to the following coordinates in')}${placeConfirmation}:\n${maplink}`

			if (platform === 'discord' && client.config.geocoding.staticProvider.toLowerCase() === 'tileservercache') {
				const tileServerOptions = client.query.tileserverPregen.getConfigForTileType('location')
				if (tileServerOptions.type !== 'none') {
					// Could also use logic to not pregenerate
					staticMap = await client.query.tileserverPregen.getPregeneratedTileURL('location', 'location', {
						latitude: lat,
						longitude: lon,
					}, tileServerOptions.type)

					message = {
						embeds: [{
							color: 0x00ff00,
							title: translator.translate('New location'),
							description: `${translator.translate('I set ')}${target.name}${translator.translate('\'s location to the following coordinates in')}${placeConfirmation}`,
							image: {
								url: staticMap,
							},
							url: maplink,
						}],
					}

					if (client.config.discord.uploadEmbedImages) {
						message.embeds[0].image.url = 'attachment://image.png'
						message.files = [{ attachment: staticMap, name: 'image.png' }]
					}
				}
			}
		}

		await client.query.updateQuery('humans', { latitude: lat, longitude: lon }, { id: target.id })
		await client.query.updateQuery('profiles', { latitude: lat, longitude: lon }, { id: target.id, profile_no: currentProfileNo })

		await msg.reply(message)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}
