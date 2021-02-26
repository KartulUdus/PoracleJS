exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		let platform = target.type.split(':')[0]
		if (platform === 'webhook') platform = 'discord'

		// Remove arguments that we don't want to keep for area processing
		for (let i = 0; i < args.length; i++) {
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

		const matches = search.match(/^([-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*([-+]?(?:180(\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/)
		if (matches != null && matches.length >= 2) {
			lat = parseFloat(matches[1])
			lon = parseFloat(matches[2])
		} else {
			if (args.length == 1 && search.match(/^\d{1,5}$/) == null) {
				await msg.react(translator.translate('🙅'))
				return await msg.reply(`${translator.translate('Oops, you need to specify more than just a city name to locate accurately your position')}`)
			}
			const locations = await client.query.geolocate(search)
			if (locations === undefined || locations.length == 0) {
				return await msg.react(translator.translate('🙅'))
			}
			lat = locations[0].latitude
			lon = locations[0].longitude
			placeConfirmation = locations[0].city ? ` **${locations[0].city} - ${locations[0].country}** ` : ` **${locations[0].country}** `
		}

		const maplink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
		message = `👋, ${translator.translate('I set ')}${target.name}${translator.translate('\'s location to the following coordinates in')}${placeConfirmation}:\n${maplink}`

		if (platform === 'discord' && client.config.geocoding.staticMapType.location && client.config.geocoding.staticProvider.toLowerCase() === 'tileservercache') {
			staticMap = await client.query.tileserverPregen.getPregeneratedTileURL('location', 'location', { latitude: lat, longitude: lon }, client.config.geocoding.staticMapType.location)
			message = {
				embed: {
					color: 0x00ff00,
					title: translator.translate('New location'),
					description: `${translator.translate('I set ')}${target.name}${translator.translate('\'s location to the following coordinates in')}${placeConfirmation}`,
					image: {
						url: staticMap,
					},
					url: maplink,
				},
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
