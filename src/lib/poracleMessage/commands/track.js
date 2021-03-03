exports.run = async (client, msg, args) => {
	try {
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

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
				forceEverythingSeparately = true
				individuallyAllowed	= false
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

		if (distance > 0 && !userHasLocation && !target.webhook) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !target.webhook) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
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
			min_time: minTime,
		}))
		if (!insert.length) {
			return await msg.reply(translator.translate('404 No monsters found'))
		}
		const result = await client.query.insertOrUpdateQuery('monsters', insert)
		reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		client.log.info(`${target.name} started tracking monsters: ${monsters.map((m) => m.name).join(', ')}`)

		// }

		await msg.react(reaction)
	} catch (err) {
		client.log.error('Track command unhappy:', err)
	}
}
