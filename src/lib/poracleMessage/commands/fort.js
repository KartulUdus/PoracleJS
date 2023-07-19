const helpCommand = require('./help')
const trackedCommand = require('./tracked')

exports.run = async (client, msg, args, options) => {
	const logReference = Math.random().toString().slice(2, 11)

	try {
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
			const tipMsg = 'Valid commands are e.g. `{0}fort everything`, `{0}fort pokestop include_empty`, `{0}fort gym removal`'

			await msg.reply(
				translator.translateFormat(tipMsg, util.prefix),
				{ style: 'markdown' },
			)
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		let reaction = '👌'

		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')

		let distance = 0
		let template = client.config.general.defaultTemplateName
		let includeEmpty = false
		const changes = []
		const pings = msg.getPings()

		let fortType

		args.forEach((element) => {
			if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'pokestop') fortType = 'pokestop'
			else if (element === 'gym') fortType = 'gym'
			else if (element === 'everything') fortType = 'everything'

			else if (element === 'include empty') includeEmpty = true
			else if (element === 'location') changes.push('location')
			else if (element === 'name') changes.push('name')
			else if (element === 'photo') changes.push('image_url')
			else if (element === 'removal') changes.push('removal')
			else if (element === 'new') changes.push('new')
		})
		if (client.config.tracking.defaultDistance !== 0 && distance === 0 && !msg.isFromAdmin) distance = client.config.tracking.defaultDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance && !msg.isFromAdmin) distance = client.config.tracking.maxDistance
		if (distance > 0 && !userHasLocation && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !remove && !msg.isFromAdmin) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !remove && msg.isFromAdmin) {
			await msg.reply(`${translator.translate('Warning: Admin command detected without distance set - using default distance')} ${client.config.tracking.defaultDistance}`)
			distance = client.config.tracking.defaultDistance
		}

		// if (!teams.length) {
		// 	return await msg.reply(translator.translate('404 No team types found'))
		// }

		if (!remove) {
			const insert = [{
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				template: template.toString(),
				distance: +distance,
				fort_type: fortType,
				include_empty: includeEmpty,
				change_types: JSON.stringify(changes),
			}]

			const tracked = await client.query.selectAllQuery('forts', { id: target.id, profile_no: currentProfileNo })
			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.team === toInsert.team)) {
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
				for (const lure of alreadyPresent) {
					message = message.concat(translator.translate('Unchanged: '), await trackedCommand.fortUpdateRowText(client.config, translator, client.GameData, lure, client.scannerQuery), '\n')
				}
				for (const lure of updates) {
					message = message.concat(translator.translate('Updated: '), await trackedCommand.fortUpdateRowText(client.config, translator, client.GameData, lure, client.scannerQuery), '\n')
				}
				for (const lure of insert) {
					message = message.concat(translator.translate('New: '), await trackedCommand.fortUpdateRowText(client.config, translator, client.GameData, lure, client.scannerQuery), '\n')
				}
			}

			await client.query.deleteWhereInQuery(
				'forts',
				{
					id: target.id,
					profile_no: currentProfileNo,
				},
				updates.map((x) => x.uid),
				'uid',
			)

			await client.query.insertQuery('forts', [...insert, ...updates])

			client.log.info(`${logReference}: ${target.name} started tracking for fort updates ${changes.join(', ')}`)
			await msg.reply(message, { style: 'markdown' })

			reaction = insert.length ? '✅' : reaction
		} else {
			let result = 0
			// if (teams.length) {
			// 	const lvlResult = await client.query.deleteWhereInQuery('forts', {
			// 		id: target.id,
			// 		profile_no: currentProfileNo,
			// 	}, teams, 'team')
			// 	client.log.info(`${logReference}: ${target.name} stopped tracking gym ${teams.join(', ')}`)
			// 	result += lvlResult
			// }
			if (commandEverything) {
				const everythingResult = await client.query.deleteQuery('forts', {
					id: target.id,
					profile_no: currentProfileNo,
				})
				client.log.info(`${logReference}: ${target.name} stopped tracking all gyms`)
				result += everythingResult
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
		}

		await msg.react(reaction)
	} catch (err) {
		client.log.error(`${logReference}: fort command unhappy:`, err)
		msg.reply(`There was a problem making these changes, the administrator can find the details with reference ${logReference}`)
	}
}
