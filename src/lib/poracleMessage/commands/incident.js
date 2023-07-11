const helpCommand = require('./help')
const trackedCommand = require('./tracked')

exports.run = async (client, msg, args, options) => {
	const logReference = Math.random().toString().slice(2, 11)

	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${logReference}: ${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		if (!await util.commandAllowed(commandName) && !args.find((arg) => arg === 'remove')) {
			await msg.react('🚫')
			return msg.reply(translator.translate('You do not have permission to execute this command'))
		}

		if (args.length === 0) {
			await msg.reply(
				translator.translateFormat('Valid commands are e.g. `{0}incident giovanni`, `{0}incident dragon`, `{0}incident remove everything`', util.prefix),
				{ style: 'markdown' },
			)
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		const typeArray = Object.values(client.GameData.grunts).map((grunt) => grunt.type.toLowerCase())
		const eventArray = Object.values(client.GameData.utilData.pokestopEvent).map((x) => x.name.toLowerCase())

		let reaction = '👌'
		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')
		let distance = 0
		let template = client.config.general.defaultTemplateName
		let gender = 0
		let clean = false
		const types = [] // args.filter((arg) => typeArray.includes(arg))
		const pings = msg.getPings()

		for (const element of args) {
			if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'female') gender = 2
			else if (element === 'male') gender = 1
			else if (element === 'clean') clean = true
			else if (typeArray.includes(element) || element === 'everything') types.push(element)
			else if (eventArray.includes(element)) types.push(element)
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
		if (distance === 0 && !userHasArea && !remove && msg.isFromAdmin) {
			await msg.reply(`${translator.translate('Warning: Admin command detected without distance set - using default distance')} ${client.config.tracking.defaultDistance}`)
			distance = client.config.tracking.defaultDistance
		}
		if (!types.length) {
			return await msg.reply(translator.translate('404 No valid invasion types found'))
		}

		if (!remove) {
			const insert = types.map((o) => ({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				template: template.toString(),
				distance: +distance,
				gender: +gender,
				clean: +clean,
				grunt_type: o,
			}))

			const tracked = await client.query.selectAllQuery('invasion', { id: target.id, profile_no: currentProfileNo })
			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.grunt_type === toInsert.grunt_type)) {
					const differences = client.updatedDiff(existing, toInsert)

					switch (Object.keys(differences).length) {
						case 1:		// No differences (only UID)
							// No need to insert
							alreadyPresent.push(toInsert)
							insert.splice(i, 1)
							break
						case 2:		// One difference (something + uid)
							if (Object.keys(differences).some((x) => ['distance', 'template', 'clean'].includes(x))) {
								updates.push({
									...toInsert,
									uid: existing.uid,
								})
								insert.splice(i, 1)
							}
							break
						default:	// more differences
							break
					}
				}
			}

			let message = ''

			if ((alreadyPresent.length + updates.length + insert.length) > 50) {
				message = translator.translateFormat('I have made a lot of changes. See {0}{1} for details', util.prefix, translator.translate('tracked'))
			} else {
				alreadyPresent.forEach((invasion) => {
					message = message.concat(translator.translate('Unchanged: '), trackedCommand.invasionRowText(client.config, translator, client.GameData, invasion), '\n')
				})
				updates.forEach((invasion) => {
					message = message.concat(translator.translate('Updated: '), trackedCommand.invasionRowText(client.config, translator, client.GameData, invasion), '\n')
				})
				insert.forEach((invasion) => {
					message = message.concat(translator.translate('New: '), trackedCommand.invasionRowText(client.config, translator, client.GameData, invasion), '\n')
				})
			}

			await client.query.deleteWhereInQuery(
				'invasion',
				{
					id: target.id,
					profile_no: currentProfileNo,
				},
				updates.map((x) => x.uid),
				'uid',
			)

			await client.query.insertQuery('invasion', [...insert, ...updates])

			client.log.info(`${logReference}: ${target.name} started tracking ${types.join(', ')} invasions`)
			await msg.reply(message, { style: 'markdown' })
			reaction = insert.length ? '✅' : reaction
		} else {
			let result
			if (commandEverything) {
				result = await client.query.deleteQuery('invasion', { id: target.id, profile_no: currentProfileNo })
				client.log.info(`${logReference}: ${target.name} stopped tracking all invasions`)
			} else {
				result = await client.query.deleteWhereInQuery('invasion', {
					id: target.id,
					profile_no: currentProfileNo,
				}, types, 'grunt_type')
				client.log.info(`${target.name} stopped tracking ${types.join(', ')} invasions`)
			}

			msg.reply(
				''.concat(
					result === 1 ? translator.translate('I removed 1 entry')
						: translator.translateFormat('I removed {0} entries', result),
					', ',
					translator.translateFormat('use `{0}{1}` to see what you are currently tracking', util.prefix, translator.translate('tracked')),
				),
				{ style: 'markdown' },
			)
			reaction = result || client.config.database.client === 'sqlite' ? '✅' : reaction
			client.log.info(`${logReference}: ${target.name} deleted ${types.join(', ')} invasions`)
		}

		await msg.react(reaction)
	} catch (err) {
		client.log.error(`${logReference}: invasion command unhappy:`, err)
		msg.reply(`There was a problem making these changes, the administrator can find the details with reference ${logReference}`)
	}
}
