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
			await msg.reply(translator.translateFormat('Valid commands are e.g. `{0}quest spinda`, `{0}quest energycharizard`, `{0}quest remove everything`', util.prefix),
				{ style: 'markdown' })
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		const typeArray = Object.keys(client.GameData.utilData.types).map((o) => o.toLowerCase())
		let reaction = '👌'

		const pings = msg.getPings()
		let monsters = []
		let fullMonsters = []
		let items = []
		let distance = 0
		const questTracks = []
		let template = client.config.general.defaultTemplateName
		let mustShiny = 0
		let remove = false
		let minDust = 10000000
		let stardustTracking = 9999999
		const energyMonsters = []
		let energyMonster = 0
		let commandEverything = 0
		let clean = false

		let disableEverythingTracking
		switch (client.config.tracking.everythingFlagPermissions.toLowerCase()) {
			case 'allow-any':
			case 'allow-and-always-individually':
			case 'allow-and-ignore-individually': {
				disableEverythingTracking = false
				break
			}
			case 'deny':
			default: {
				disableEverythingTracking = true
			}
		}

		const argTypes = args.filter((arg) => typeArray.includes(arg))
		const genCommand = args.filter((arg) => arg.match(client.re.genRe))
		const gen = genCommand.length ? client.GameData.utilData.genData[+(genCommand[0].match(client.re.genRe)[2])] : 0

		fullMonsters = Object.values(client.GameData.monsters).filter((mon) => (
			(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
			|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))
			|| args.includes('all pokemon')) && !mon.form.id)
		if (gen) fullMonsters = fullMonsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
		monsters = fullMonsters.map((mon) => mon.id)
		items = Object.keys(client.GameData.items).filter((key) => args.includes(translator.translate(client.GameData.items[key].name.toLowerCase())) || args.includes('all items'))
		if (args.includes('everything') && (!disableEverythingTracking || args.includes('remove') || msg.isFromAdmin)) {
			monsters = Object.values(client.GameData.monsters).filter((mon) => !mon.form.id).map((m) => m.id)
			items = Object.keys(client.GameData.items)
			minDust = 0
			stardustTracking = -1
			energyMonsters.push('0')
			commandEverything = 1
		}
		args.forEach((element) => {
			if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.stardustRe)) {
				minDust = +element.match(client.re.stardustRe)[2]
				stardustTracking = -1
			} else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'stardust') {
				minDust = 0
				stardustTracking = -1
			} else if (element.match(client.re.energyRe)) {
				[,, energyMonster] = element.match(client.re.energyRe)
				energyMonster = translator.reverse(energyMonster.toLowerCase(), true).toLowerCase()
				energyMonster = Object.values(client.GameData.monsters).find((mon) => energyMonster.includes(mon.name.toLowerCase()) && mon.form.id === 0)
				energyMonster = energyMonster ? energyMonster.id : 0
				if (+energyMonster > 0) energyMonsters.push(energyMonster)
			} else if (element === 'energy') {
				energyMonsters.push('0')
			} else if (element === 'shiny') mustShiny = 1
			else if (element === 'remove') remove = true
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

		if (+minDust < 10000000) {
			questTracks.push({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				reward: minDust,
				template,
				shiny: mustShiny,
				reward_type: 3,
				distance,
				clean,
			})
		}

		energyMonsters.forEach((pid) => {
			questTracks.push({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				reward: pid,
				template,
				shiny: mustShiny,
				reward_type: 12,
				distance,
				clean,
			})
		})

		monsters.forEach((pid) => {
			questTracks.push({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				reward: pid,
				template,
				shiny: mustShiny,
				reward_type: 7,
				distance,
				clean,
			})
		})

		items.forEach((i) => {
			questTracks.push({
				id: target.id,
				profile_no: currentProfileNo,
				ping: pings,
				reward: i,
				template,
				shiny: mustShiny,
				reward_type: 2,
				distance,
				clean,
			})
		})

		if (!questTracks.length) {
			return await msg.reply(translator.translate('404 No valid quests found'))
		}

		if (!remove) {
			const insert = questTracks
			const tracked = await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo })
			const updates = []
			const alreadyPresent = []

			for (let i = insert.length - 1; i >= 0; i--) {
				const toInsert = insert[i]

				for (const existing of tracked.filter((x) => x.reward_type == toInsert.reward_type && x.reward == toInsert.reward)) {
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
				alreadyPresent.forEach((quest) => {
					message = message.concat(translator.translate('Unchanged: '), trackedCommand.questRowText(translator, client.GameData, quest), '\n')
				})
				updates.forEach((quest) => {
					message = message.concat(translator.translate('Updated: '), trackedCommand.questRowText(translator, client.GameData, quest), '\n')
				})
				insert.forEach((quest) => {
					message = message.concat(translator.translate('New: '), trackedCommand.questRowText(translator, client.GameData, quest), '\n')
				})
			}

			if (insert.length) {
				await client.query.insertQuery('quest', insert)
			}
			for (const row of updates) {
				await client.query.updateQuery('quest', row, { uid: row.uid })
			}

			client.log.info(`${target.name} added quest trackings`)

			// const result = await client.query.insertOrUpdateQuery('quest', questTracks)
			await msg.reply(message)
			reaction = insert.length ? '✅' : reaction
		} else {
			// in case no items or pokemon are in the command, add a dummy 0 to not break sql
			items.push(0)
			monsters.push(0)
			energyMonsters.push(10000)
			const remQuery = `
				delete from quest WHERE id='${target.id}' and profile_no=${currentProfileNo} and
				((reward_type = 2 and reward in(${items})) or (reward_type = 7 and reward in(${monsters})) or (reward_type = 3 and reward > ${stardustTracking}) or (reward_type = 12 and reward in(${energyMonsters})) or (reward_type = 12 and ${commandEverything}=1))
				`
			let result = await client.query.misteryQuery(remQuery)

			result = result ? result.affectedRows : 0

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
		client.log.error(`${logReference}: Quest command unhappy:`, err)
		msg.reply(`There was a problem making these changes, the administrator can find the details with reference ${logReference}`)
	}
}
