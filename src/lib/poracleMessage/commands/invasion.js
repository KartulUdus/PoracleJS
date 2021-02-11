exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		const typeArray = Object.values(client.GameData.grunts).map((grunt) => grunt.type.toLowerCase())

		let reaction = '👌'
		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')
		let distance = 0
		let template = client.config.general.defaultTemplateName
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
		if (client.config.tracking.defaultDistance !== 0 && distance === 0 && !msg.isFromAdmin) distance = client.config.tracking.defaultDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance && !msg.isFromAdmin) distance = client.config.tracking.maxDistance
		if (distance > 0 && !userHasLocation && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !remove) {
			await msg.react(client.translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (!types.length) {
			return await msg.reply(translator.translate('404 No valid invasion types found'))
		}

		if (!remove) {
			const insertData = types.map((o) => ({
				id: target.id,
				profile_no: currentProfileNo,
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
			let result = 0
			if (commandEverything) {
				result = await client.query.deleteQuery('invasion', { id: target.id, profile_no: currentProfileNo })
				client.log.info(`${target.name} stopped tracking all invasions`)
			} else {
				result = client.query.deleteWhereInQuery('invasion', {
					id: target.id,
					profile_no: currentProfileNo
				}, types, 'grunt_type')
				client.log.info(`${target.name} stopped tracking ${types.join(', ')} invasions`)
			}
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			client.log.info(`${target.name} deleted ${types.join(', ')} invasions`)
		}

		await msg.react(reaction)
	} catch (err) {
		client.log.error('invasion command unhappy:', err)
	}
}
