const helpCommand = require('./help.js')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		if (args.length === 0) {
			await msg.reply(translator.translateFormat('Valid commands are e.g. `{0}invasion giovanni`, `{0}invasion dragon`, `{0}invasion remove everything`', util.prefix),
				{ style: 'markdown' })
			if (helpCommand.isHelpAvailable(client, language, target, commandName)) {
				await msg.reply(translator.translateFormat('For more assistance, `{0}{1} {2}`', util.prefix, translator.translate('help'), translator.translate(commandName)))
			} else {
				await msg.reply(translator.translateFormat('For more assistance, `{0}{1}`', util.prefix, translator.translate('help')))
			}
			return
		}

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
		if (distance === 0 && !userHasArea && !remove && !msg.isFromAdmin) {
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
					profile_no: currentProfileNo,
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
