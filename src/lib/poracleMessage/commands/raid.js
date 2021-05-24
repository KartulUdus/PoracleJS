const helpCommand = require('./help.js')
const trackedCommand = require('./tracked.js')
const objectDiff = require('../../objectDiff')

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

		if (args.length === 0) {
			await msg.reply(translator.translateFormat('Valid commands are e.g. `{0}raid level5`, `{0}raid articuno`, `{0}raid remove everything`', util.prefix),
				{ style: 'markdown' })
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		const typeArray = Object.keys(client.GameData.utilData.types).map((o) => o.toLowerCase())

		let reaction = '👌'

		const remove = !!args.find((arg) => arg === 'remove')
		const commandEverything = !!args.find((arg) => arg === 'everything')

		let monsters = []
		let exclusive = 0
		let distance = 0
		let team = 4
		let template = client.config.general.defaultTemplateName
		let clean = false
		let levels = []
		const pings = msg.getPings()
		const formNames = args.filter((arg) => arg.match(client.re.formRe)).map((arg) => client.translatorFactory.reverseTranslateCommand(arg.match(client.re.formRe)[2], true).toLowerCase())
		const argTypes = args.filter((arg) => typeArray.includes(arg))

		// Substitute aliases
		const pokemonAlias = require('../../../../config/pokemonAlias.json')
		for (let i = args.length - 1; i >= 0; i--) {
			let alias = pokemonAlias[args[i]]
			if (alias) {
				if (!Array.isArray(alias)) alias = [alias]
				args.splice(i, 1, ...alias.map((x) => x.toString()))
			}
		}

		if (formNames.length) {
			monsters = Object.values(client.GameData.monsters).filter((mon) => (
				(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))
				|| args.includes('everything')) && formNames.includes(mon.form.name.toLowerCase()))
		} else {
			monsters = Object.values(client.GameData.monsters).filter((mon) => (
				(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))) && !mon.form.id)
		}

		const genCommand = args.filter((arg) => arg.match(client.re.genRe))
		const gen = genCommand.length ? client.GameData.utilData.genData[+genCommand[0].replace(client.translator.translate('gen'), '')] : 0

		if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)

		args.forEach((element) => {
			if (element === 'ex') exclusive = 1
			else if (element.match(client.re.levelRe)) levels.push(element.match(client.re.levelRe)[2])
			else if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'instinct' || element === 'yellow') team = 3
			else if (element === 'valor' || element === 'red') team = 2
			else if (element === 'mystic' || element === 'blue') team = 1
			else if (element === 'harmony' || element === 'gray') team = 0
			else if (element === 'everything' && !formNames.length) levels = [1, 2, 3, 4, 5, 6]
			else if (element === 'clean') clean = true
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
		if (!levels.length && !monsters.length) {
			return await msg.reply(translator.translate('404 no valid tracks found'))
		}

		if (!remove) {
			const insert = monsters.map((mon) => ({
				id: target.id,
				profile_no: currentProfileNo,
				pokemon_id: mon.id,
				ping: pings,
				exclusive: !!exclusive,
				template,
				distance,
				team,
				clean,
				level: 9000,
				form: mon.form.id,
			}))

			levels.forEach((level) => {
				insert.push({
					id: target.id,
					profile_no: currentProfileNo,
					pokemon_id: 9000,
					ping: pings,
					exclusive: !!exclusive,
					template,
					distance,
					team,
					clean,
					level,
					form: 0,
				})
			})

			const tracked = await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo })
			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.pokemon_id == toInsert.pokemon_id && x.level == toInsert.level)) {
					const differences = objectDiff.diff(existing, toInsert)

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
				alreadyPresent.forEach((raid) => {
					message = message.concat(translator.translate('Unchanged: '), trackedCommand.raidRowText(translator, client.GameData, raid), '\n')
				})
				updates.forEach((raid) => {
					message = message.concat(translator.translate('Updated: '), trackedCommand.raidRowText(translator, client.GameData, raid), '\n')
				})
				insert.forEach((raid) => {
					message = message.concat(translator.translate('New: '), trackedCommand.raidRowText(translator, client.GameData, raid), '\n')
				})
			}

			if (insert.length) {
				await client.query.insertQuery('raid', insert)
			}
			for (const row of updates) {
				await client.query.updateQuery('raid', row, { uid: row.uid })
			}

			//			const result = await client.query.insertOrUpdateQuery('raid', insert)
			client.log.info(`${logReference}: ${target.name} started tracking level ${levels.join(', ')} raids`)
			await msg.reply(message)
			reaction = insert.length ? '✅' : reaction
		} else {
			const monsterIds = monsters.map((mon) => mon.id)
			let result = 0
			if (monsterIds.length) {
				const monResult = await client.query.deleteWhereInQuery('raid', {
					id: target.id,
					profile_no: currentProfileNo,
				}, monsterIds, 'pokemon_id')
				result += monResult
			}
			if (levels.length) {
				const lvlResult = await client.query.deleteWhereInQuery('raid', {
					id: target.id,
					profile_no: currentProfileNo,
				}, levels, 'level')
				client.log.info(`${logReference}: ${target.name} stopped tracking level ${levels.join(', ')} raids`)
				result += lvlResult
			}
			if (commandEverything) {
				const everythingResult = await client.query.deleteQuery('raid', { id: target.id, profile_no: currentProfileNo })
				client.log.info(`${logReference}: ${target.name} stopped tracking all raids`)
				result += everythingResult
			}
			msg.reply(
				''.concat(
					result == 1 ? translator.translate('I removed 1 entry')
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
		client.log.error(`${logReference} Raid command unhappy:`, err)
		msg.reply(`There was a problem making these changes, the administrator can find the details with reference ${logReference}`)
	}
}
