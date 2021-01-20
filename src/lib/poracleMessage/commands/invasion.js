exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const translator = client.translatorFactory.Translator(language)

		const typeArray = Object.values(client.utilData.gruntTypes).map((grunt) => grunt.type.toLowerCase())

		//		let validTracks = 0
		let reaction = '👌'
		//		for (const args of command) {
		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')
		let distance = 0
		let template = 1
		let gender = 0
		let clean = false
		const types = args.filter((arg) => typeArray.includes(arg))
		const pings = msg.getPings()

		for (const element of args) {
			if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'female') gender = 2
			else if (element === 'male') gender = 1
			else if (element === 'clean') clean = true
			else if (typeArray.includes(element) || element === 'everything') types.push(element)
		}
		if (client.config.tracking.defaultDistance !== 0 && distance === 0) distance = client.config.tracking.defaultDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance) distance = client.config.tracking.maxDistance
		if (distance > 0 && !userHasLocation && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}
		if (!types.length) {
			return await msg.reply(translator.translate('404 No valid invasion types found'))
		}

		if (!remove) {
			const insertData = types.map((o) => ({
				id: target.id,
				ping: pings,
				template,
				distance,
				gender,
				clean,
				grunt_type: o,
			}))
			const result = await client.query.insertOrUpdateQuery('invasion', insertData)
			client.log.info(`${target.name} started tracking ${types.join(', ')} invasions`)
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		} else {
			if (commandEverything) {
				const remQuery = `delete from invasion WHERE id=${target.id}`
				const result = await client.query.misteryQuery(remQuery)
				reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			} else {
				client.query.deleteWhereInQuery('invasion', target.id, types, 'grunt_type')
			}
			client.log.info(`${target.name} deleted ${types.join(', ')} invasions`)
		}
		//		}

		await msg.react(reaction)
	} catch (err) {
		client.log.error('invasion command unhappy:', err)
	}
}
