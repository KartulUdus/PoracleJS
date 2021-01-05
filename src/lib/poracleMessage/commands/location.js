exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, isRegistered, userHasLocation, userHasArea,
		} = await util.buildTarget(args)

		if (!canContinue) return

		// Check target
		const confAreas = client.geofence.map((area) => area.name.toLowerCase().replace(/ /gi, '_')).sort()
		const confAreas2 = client.geofence.map((area) => area.name.replace(/ /gi, '_')).sort()
		const confUse = confAreas2.join('\n')

		// Remove arguments that we don't want to keep for area processing
		for (let i = 0; i < args.length; i++) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		const search = args.join(' ')

		let lat
		let lon

		const matches = search.match(/^([-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*([-+]?(?:180(\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/)
		if (matches != null && matches.length >= 2) {
			lat = parseFloat(matches[1])
			lon = parseFloat(matches[2])
		} else {
			const locations = await client.query.geolocate(search)
			if (locations === undefined || locations.length === 0) {
				return await msg.react(client.translator.translate('🙅'))
			}
			lat = locations[0].latitude
			lon = locations[0].longitude
		}

		await client.query.updateQuery('humans', { latitude: lat, longitude: lon }, { id: target.id })
		const maplink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
		await msg.reply(`${client.translator.translate(':wave:, I set your location to : [here]')}(${maplink}) `)
		//		await msg.reply(`${client.translator.translate(':wave:, I set ')}${target.name}${client.translator.translate('s location to : ')}\n `)

		await msg.react('✅')
	} catch (err) {
		client.log.error(`location command ${msg.content} unhappy:`, err)
	}
}
