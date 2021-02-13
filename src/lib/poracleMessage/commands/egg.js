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

		let exclusive = 0
		let distance = 0
		let team = 4
		let template = client.config.general.defaultTemplateName
		let clean = false
		let levels = []
		const pings = msg.getPings()

		args.forEach((element) => {
			if (element === 'ex') exclusive = 1
			else if (element.match(client.re.levelRe)) levels.push(element.match(client.re.levelRe)[2])
			else if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'instinct' || element === 'yellow') team = 3
			else if (element === 'valor' || element === 'red') team = 2
			else if (element === 'mystic' || element === 'blue') team = 1
			else if (element === 'harmony' || element === 'gray') team = 0
			else if (element === 'everything') levels = [1, 2, 3, 4, 5, 6]
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

		if (!levels.length) {
			return await msg.reply(translator.translate('404 No raid egg levels found'))
		}

		if (!remove) {
			const insert = levels.map((lvl) => ({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				exclusive: !!exclusive,
				template,
				distance,
				team,
				clean,
				level: lvl,
			}))

			const result = await client.query.insertOrUpdateQuery('egg', insert)
			client.log.info(`${target.name} started tracking level ${levels.join(', ')} eggs`)

			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		} else {
			let result = 0
			if (levels.length) {
				const lvlResult = await client.query.deleteWhereInQuery('egg', {
					id: target.id,
					profile_no: currentProfileNo,
				}, levels, 'level')
				client.log.info(`${target.name} stopped tracking level ${levels.join(', ')} eggs`)
				result += lvlResult
			}
			if (commandEverything) {
				const everythingResult = await client.query.deleteQuery('egg', {
					id: target.id,
					profile_no: currentProfileNo,
				})
				client.log.info(`${target.name} stopped tracking all eggs`)
				result += everythingResult
			}
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		}

		await msg.react(reaction)
	} catch (err) {
		client.log.error('egg command unhappy:', err)
	}
}
