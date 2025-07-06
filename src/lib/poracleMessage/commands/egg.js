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
			await msg.reply(
				translator.translateFormat('Valid commands are e.g. `{0}egg level5`, `{0}egg remove everything`', util.prefix),
				{ style: 'markdown' },
			)
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		let reaction = '👌'

		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')

		let exclusive = 0
		let distance = 0
		let team = 4
		let template = client.config.general.defaultTemplateName
		let clean = false
		let rsvpChanges = 0
		const levelSet = new Set()
		const pings = msg.getPings()

		args.forEach((element) => {
			if (element === 'ex') exclusive = 1
			else if (element.match(client.re.levelRe)) levelSet.add(+element.match(client.re.levelRe)[2])
			else if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'instinct' || element === 'yellow') team = 3
			else if (element === 'valor' || element === 'red') team = 2
			else if (element === 'mystic' || element === 'blue') team = 1
			else if (element === 'harmony' || element === 'gray') team = 0
			else if (element === 'everything') Object.keys(client.GameData.utilData.raidLevels).forEach((x) => levelSet.add(+x))
			else if (element === 'clean') clean = true
			else if (element === 'no rsvp') rsvpChanges = 0
			else if (element === 'rsvp') rsvpChanges = 1
			else if (element === 'rsvp only') rsvpChanges = 2
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

		const levels = [...levelSet]

		if (!levels.length) {
			return await msg.reply(translator.translate('404 No raid egg levels found'))
		}

		if (!remove) {
			const insert = levels.map((lvl) => ({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				exclusive: +exclusive,
				template: template.toString(),
				distance: +distance,
				team: +team,
				clean: +clean,
				level: +lvl,
				gym_id: null,
				rsvp_changes: +rsvpChanges,
			}))

			const tracked = await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo })
			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.level === toInsert.level)) {
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
				for (const egg of alreadyPresent) {
					message = message.concat(translator.translate('Unchanged: '), await trackedCommand.eggRowText(client.config, translator, client.GameData, egg, client.scannerQuery), '\n')
				}
				for (const egg of updates) {
					message = message.concat(translator.translate('Updated: '), await trackedCommand.eggRowText(client.config, translator, client.GameData, egg, client.scannerQuery), '\n')
				}
				for (const egg of insert) {
					message = message.concat(translator.translate('New: '), await trackedCommand.eggRowText(client.config, translator, client.GameData, egg, client.scannerQuery), '\n')
				}
			}

			await client.query.deleteWhereInQuery(
				'egg',
				{
					id: target.id,
					profile_no: currentProfileNo,
				},
				updates.map((x) => x.uid),
				'uid',
			)

			await client.query.insertQuery('egg', [...insert, ...updates])

			client.log.info(`${logReference}: ${target.name} started tracking level ${levels.join(', ')} eggs`)
			await msg.reply(message, { style: 'markdown' })
			reaction = insert.length ? '✅' : reaction
		} else {
			let result = 0
			if (levels.length) {
				const lvlResult = await client.query.deleteWhereInQuery('egg', {
					id: target.id,
					profile_no: currentProfileNo,
				}, levels, 'level')
				client.log.info(`${logReference}: ${target.name} stopped tracking level ${levels.join(', ')} eggs`)
				result += lvlResult
			}
			if (commandEverything) {
				const everythingResult = await client.query.deleteQuery('egg', {
					id: target.id,
					profile_no: currentProfileNo,
				})
				client.log.info(`${logReference}: ${target.name} stopped tracking all eggs`)
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
		client.log.error(`${logReference}: egg command unhappy:`, err)
		msg.reply(`There was a problem making these changes, the administrator can find the details with reference ${logReference}`)
	}
}
