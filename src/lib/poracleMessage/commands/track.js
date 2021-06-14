const helpCommand = require('./help.js')
const trackedCommand = require('./tracked.js')
const objectDiff = require('../../objectDiff')

exports.run = async (client, msg, args, options) => {
	const logReference = Math.random().toString().slice(2, 11)

	try {
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${logReference} ${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		if (args.length === 0) {
			await msg.reply(translator.translateFormat('Valid commands are e.g. `{0}track charmander`, `{0}track everything iv100`, `{0}track gible d500`', util.prefix),
				{ style: 'markdown' })
			await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		const typeArray = Object.keys(client.GameData.utilData.types).map((o) => o.toLowerCase())

		let reaction = '👌'
		// Set defaults
		let monsters
		let distance = 0
		let minTime = 0
		let cp = 0
		let maxcp = 9000
		let iv = -1
		let maxiv = 100
		let level = 0
		let maxlevel = 40
		let atk = 0
		let def = 0
		let sta = 0
		let maxAtk = 15
		let maxDef = 15
		let maxSta = 15
		let gender = 0
		let weight = 0
		let maxweight = 9000000
		let rarity = -1
		let maxRarity = 6
		let greatLeague = 4096
		let greatLeagueCP = 0
		let ultraLeague = 4096
		let ultraLeagueCP = 0
		const pvpFilterMaxRank = Math.min(client.config.pvp.pvpFilterMaxRank, 4096)
		const { pvpFilterGreatMinCP } = client.config.pvp
		const { pvpFilterUltraMinCP } = client.config.pvp
		let template = client.config.general.defaultTemplateName
		let clean = false
		const pings = msg.getPings()

		let disableEverythingTracking
		let forceEverythingSeparately
		let individuallyAllowed
		switch (client.config.tracking.everythingFlagPermissions.toLowerCase()) {
			case 'allow-any': {
				disableEverythingTracking = false
				forceEverythingSeparately = false
				individuallyAllowed	= true
				break
			}
			case 'allow-and-always-individually': {
				disableEverythingTracking = false
				forceEverythingSeparately = true
				individuallyAllowed	= true
				break
			}
			case 'allow-and-ignore-individually': {
				disableEverythingTracking = false
				forceEverythingSeparately = false
				individuallyAllowed	= false
				break
			}
			case 'deny':
			default: {
				disableEverythingTracking = true
				forceEverythingSeparately = false
				individuallyAllowed	= true
			}
		}

		// Substitute aliases
		const pokemonAlias = require('../../../../config/pokemonAlias.json')
		for (let i = args.length - 1; i >= 0; i--) {
			let alias = pokemonAlias[args[i]]
			if (alias) {
				if (!Array.isArray(alias)) alias = [alias]
				args.splice(i, 1, ...alias.map((x) => x.toString()))
			}
		}

		// Check for monsters or forms
		const formArgs = args.filter((arg) => arg.match(client.re.formRe))
		const formNames = formArgs ? formArgs.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.match(client.re.formRe)[2], true).toLowerCase()) : []
		const argTypes = args.filter((arg) => typeArray.includes(arg))
		const genCommand = args.filter((arg) => arg.match(client.re.genRe))
		const gen = genCommand.length ? client.GameData.utilData.genData[+(genCommand[0].match(client.re.genRe)[2])] : 0
		if (formNames.length) {
			monsters = Object.values(client.GameData.monsters).filter((mon) => (
				(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))
				|| args.includes('everything') && !disableEverythingTracking
				|| args.includes('everything') && msg.isFromAdmin) && formNames.includes(mon.form.name.toLowerCase()))

			if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
		} else if (gen || (args.includes('individually') && (individuallyAllowed || msg.isFromAdmin)) || forceEverythingSeparately) {
			monsters = Object.values(client.GameData.monsters).filter((mon) => (
				(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))
				|| args.includes('everything') && !disableEverythingTracking
				|| args.includes('everything') && msg.isFromAdmin) && !mon.form.id)

			if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
		} else {
			monsters = Object.values(client.GameData.monsters).filter((mon) => (
				(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))) && !mon.form.id)

			if (args.includes('everything') && !disableEverythingTracking || args.includes('everything') && msg.isFromAdmin) {
				monsters.push({
					id: 0,
					form: {
						id: 0,
					},
				})
			}
		}
		// Parse command elements to stuff
		args.forEach((element) => {
			if (element.match(client.re.maxlevelRe)) [,, maxlevel] = element.match(client.re.maxlevelRe)
			else if (element.match(client.re.templateRe)) [,, template] = element.match(client.re.templateRe)
			else if (element.match(client.re.greatLeagueRe)) [,, greatLeague] = element.match(client.re.greatLeagueRe)
			else if (element.match(client.re.greatLeagueCPRe)) [,, greatLeagueCP] = element.match(client.re.greatLeagueCPRe)
			else if (element.match(client.re.ultraLeagueRe)) [,, ultraLeague] = element.match(client.re.ultraLeagueRe)
			else if (element.match(client.re.ultraLeagueCPRe)) [,, ultraLeagueCP] = element.match(client.re.ultraLeagueCPRe)
			else if (element.match(client.re.maxcpRe)) [,, maxcp] = element.match(client.re.maxcpRe)
			else if (element.match(client.re.maxivRe)) [,, maxiv] = element.match(client.re.maxivRe)
			else if (element.match(client.re.maxweightRe)) [,, maxweight] = element.match(client.re.maxweightRe)
			else if (element.match(client.re.maxRarityRe)) [,, maxRarity] = element.match(client.re.maxRarityRe)
			else if (element.match(client.re.maxatkRe)) [,, maxAtk] = element.match(client.re.maxatkRe)
			else if (element.match(client.re.maxdefRe)) [,, maxDef] = element.match(client.re.maxdefRe)
			else if (element.match(client.re.maxstaRe)) [,, maxSta] = element.match(client.re.maxstaRe)
			else if (element.match(client.re.cpRe)) [,, cp] = element.match(client.re.cpRe)
			else if (element.match(client.re.levelRe)) [,, level] = element.match(client.re.levelRe)
			else if (element.match(client.re.ivRe)) [,, iv] = element.match(client.re.ivRe)
			else if (element.match(client.re.atkRe)) [,, atk] = element.match(client.re.atkRe)
			else if (element.match(client.re.defRe)) [,, def] = element.match(client.re.defRe)
			else if (element.match(client.re.staRe)) [,, sta] = element.match(client.re.staRe)
			else if (element.match(client.re.weightRe)) [,, weight] = element.match(client.re.weightRe)
			else if (element.match(client.re.tRe)) [,, minTime] = element.match(client.re.tRe)
			else if (element.match(client.re.rarityRe)) [,, rarity] = element.match(client.re.rarityRe)
			else if (element.match(client.re.dRe)) [,, distance] = element.match(client.re.dRe)
			else if (element === 'female') gender = 2
			else if (element === 'clean') clean = true
			else if (element === 'male') gender = 1
			else if (element === 'genderless') gender = 3
		})
		if (greatLeague < 4096 && ultraLeague < 4096 || greatLeague < 4096 && ultraLeagueCP > 0 || greatLeagueCP > 0 && ultraLeague < 4096 || greatLeagueCP > 0 && ultraLeagueCP > 0) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, both Great and Ultra league parameters were set in command! - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}

		// if a value for great/ultra league rank was given, force it to be not greater than pvpFilterMaxRank
		if (greatLeague < 4096 && greatLeague > pvpFilterMaxRank) greatLeague = pvpFilterMaxRank
		if (ultraLeague < 4096 && ultraLeague > pvpFilterMaxRank) ultraLeague = pvpFilterMaxRank
		// if a value for great/ultra league CP was given, force it to be not less than pvpFilterGreatMinCP/pvpFilterUltraMinCP
		if (greatLeagueCP > 0 && greatLeagueCP < pvpFilterGreatMinCP) greatLeagueCP = pvpFilterGreatMinCP
		if (ultraLeagueCP > 0 && ultraLeagueCP < pvpFilterUltraMinCP) ultraLeagueCP = pvpFilterUltraMinCP
		// if a value for great/ultra league rank was given but none for great/ultra league CP, set the later implicitly to pvpFilterGreatMinCP/pvpFilterUltraMinCP
		if (greatLeague < 4096 && greatLeagueCP === 0) greatLeagueCP = pvpFilterGreatMinCP
		if (ultraLeague < 4096 && ultraLeagueCP === 0) ultraLeagueCP = pvpFilterUltraMinCP
		// if a value for great/ultra league CP was given but none for great/ultra league rank, set the later implicitly to pvpFilterMaxRank
		if (greatLeagueCP > 0 && greatLeague === 4096) greatLeague = pvpFilterMaxRank
		if (ultraLeagueCP > 0 && ultraLeague === 4096) ultraLeague = pvpFilterMaxRank

		if (client.config.tracking.defaultDistance !== 0 && distance === 0 && !msg.isFromAdmin) distance = client.config.tracking.defaultDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance && !msg.isFromAdmin) distance = client.config.tracking.maxDistance

		if (rarity != -1 && !['1', '2', '3', '4', '5', '6'].includes(rarity)) {
			rarity = client.translatorFactory.reverseTranslateCommand(rarity, true)
			const rarityLevel = Object.keys(client.GameData.utilData.rarity).find((x) => client.GameData.utilData.rarity[x].toLowerCase() == rarity.toLowerCase())
			if (rarityLevel) {
				rarity = rarityLevel
			} else {
				rarity = -1
			}
		}
		if (maxRarity != 6 && !['1', '2', '3', '4', '5', '6'].includes(maxRarity)) {
			maxRarity = client.translatorFactory.reverseTranslateCommand(maxRarity, true)
			const maxRarityLevel = Object.keys(client.GameData.utilData.rarity).find((x) => client.GameData.utilData.rarity[x].toLowerCase() == maxRarity.toLowerCase())
			if (maxRarityLevel) {
				maxRarity = maxRarityLevel
			} else {
				maxRarity = 6
			}
		}

		if (distance > 0 && !userHasLocation && !target.webhook) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !target.webhook && !msg.isFromAdmin) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !target.webhook && msg.isFromAdmin) {
			await msg.reply(`${translator.translate('Warning: Admin command detected without distance set - using default distance')} ${client.config.tracking.defaultDistance}`)
			distance = client.config.tracking.defaultDistance
		}
		const insert = monsters.map((mon) => ({
			id: target.id,
			profile_no: currentProfileNo,
			pokemon_id: mon.id,
			ping: pings,
			distance,
			min_iv: iv,
			max_iv: maxiv,
			min_cp: cp,
			max_cp: maxcp,
			min_level: level,
			max_level: maxlevel,
			atk,
			def,
			sta,
			template,
			min_weight: weight,
			max_weight: maxweight,
			form: mon.form.id,
			max_atk: maxAtk,
			max_def: maxDef,
			max_sta: maxSta,
			gender,
			clean,
			great_league_ranking: greatLeague,
			great_league_ranking_min_cp: greatLeagueCP,
			ultra_league_ranking: ultraLeague,
			ultra_league_ranking_min_cp: ultraLeagueCP,
			rarity,
			max_rarity: maxRarity,
			min_time: minTime,
		}))
		if (!insert.length) {
			return await msg.reply(translator.translate('404 No monsters found'))
		}

		const tracked = await client.query.selectAllQuery('monsters', { id: target.id, profile_no: currentProfileNo })
		const updates = []
		const alreadyPresent = []

		for (let i = insert.length - 1; i >= 0; i--) {
			const toInsert = insert[i]

			for (const existing of tracked.filter((x) => x.pokemon_id == toInsert.pokemon_id)) {
				const differences = objectDiff.diff(existing, toInsert)

				switch (Object.keys(differences).length) {
					case 1:		// No differences (only UID)
						// No need to insert
						alreadyPresent.push(toInsert)
						insert.splice(i, 1)
						break
					case 2:		// One difference (something + uid)
						if (Object.keys(differences).some((x) => ['min_iv', 'distance', 'template', 'clean'].includes(x))) {
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
			alreadyPresent.forEach((monster) => {
				message = message.concat(translator.translate('Unchanged: '), trackedCommand.monsterRowText(translator, client.GameData, monster), '\n')
			})
			updates.forEach((monster) => {
				message = message.concat(translator.translate('Updated: '), trackedCommand.monsterRowText(translator, client.GameData, monster), '\n')
			})
			insert.forEach((monster) => {
				message = message.concat(translator.translate('New: '), trackedCommand.monsterRowText(translator, client.GameData, monster), '\n')
			})
		}

		if (insert.length) {
			await client.query.insertQuery('monsters', insert)
		}
		for (const row of updates) {
			await client.query.updateQuery('monsters', row, { uid: row.uid })
		}

		// const result = await client.query.insertOrUpdateQuery('monsters', insert)
		reaction = insert.length ? '✅' : reaction
		await msg.reply(message)
		await msg.react(reaction)

		client.log.info(`${logReference} ${target.name} started tracking monsters: ${monsters.map((m) => m.name).join(', ')}`)
	} catch (err) {
		client.log.error(`${logReference} Track command unhappy:`, err)
		msg.reply(`There was a problem making these changes, the administrator can find the details with reference ${logReference}`)
	}
}
