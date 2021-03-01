exports.run = async (client, msg, args) => {
	try {
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		let reaction = '👌'

		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')

		let distance = 0
		let template = client.config.general.defaultTemplateName
		let clean = false
		const lures = []
		const pings = msg.getPings()

		args.forEach((element) => {
			if (element === 'normal') lures.push(501)
			else if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'glacial') lures.push(502)
			else if (element === 'mossy') lures.push(503)
			else if (element === 'magnetic') lures.push(504)
			else if (element === 'everything') lures.push(0)
			else if (element === 'clean') clean = true
		})
		if (client.config.tracking.defaultDistance !== 0 && distance === 0 && !msg.isFromAdmin) distance = client.config.tracking.defaultDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance && !msg.isFromAdmin) distance = client.config.tracking.maxDistance
		if (distance > 0 && !userHasLocation && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}

		if (!lures.length) {
			return await msg.reply(translator.translate('404 No lure types found'))
		}

		if (!remove) {
			const insert = lures.map((lureId) => ({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				template,
				distance,
				clean,
				lure_id: lureId,
			}))

			const result = await client.query.insertOrUpdateQuery('lures', insert)
			client.log.info(`${target.name} started tracking lures ${lures.join(', ')}`)

			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		} else {
			let result = 0
			if (lures.length) {
				const lvlResult = await client.query.deleteWhereInQuery('lures', {
					id: target.id,
					profile_no: currentProfileNo,
				}, lures, 'lure_id')
				client.log.info(`${target.name} stopped tracking lures ${lures.join(', ')}`)
				result += lvlResult
			}
			if (commandEverything) {
				const everythingResult = await client.query.deleteQuery('lures', {
					id: target.id,
					profile_no: currentProfileNo,
				})
				client.log.info(`${target.name} stopped tracking all lures`)
				result += everythingResult
			}
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		}

		await msg.react(reaction)
	} catch (err) {
		client.log.error('lure command unhappy:', err)
	}
}
