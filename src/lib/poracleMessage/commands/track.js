exports.run = async (client, msg, args) => {
	try {
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea,
		} = await util.buildTarget(args)

		if (!canContinue) return

		const typeArray = Object.keys(client.utilData.types).map((o) => o.toLowerCase())

		let reaction = '👌'
		// const validTracks = 0
		// for (const args of command) {
		// Set defaults
		let monsters
		let distance = 0
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
		const { pvpFilterMaxRank } = client.config.pvp
		const { pvpFilterGreatMinCP } = client.config.pvp
		const { pvpFilterUltraMinCP } = client.config.pvp
		let template = 1
		let clean = false
		const pings = msg.getPings()

		// Check for monsters or forms
		const formArgs = args.filter((arg) => arg.match(client.re.formRe))
		const formNames = formArgs ? formArgs.map((arg) => client.translator.reverse(arg.replace(client.translator.translate('form'), ''), true).toLowerCase()) : []
		const argTypes = args.filter((arg) => typeArray.includes(arg))
		const genCommand = args.filter((arg) => arg.match(client.re.genRe))
		const gen = genCommand.length ? client.utilData.genData[+(genCommand[0].replace(client.translator.translate('gen'), ''))] : 0

		if (formNames.length) {
			monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && formNames.includes(mon.form.name.toLowerCase())
					|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && formNames.includes(mon.form.name.toLowerCase())
					|| args.includes('everything') && !client.config.tracking.disableEverythingTracking
					|| args.includes('everything') && msg.isFromAdmin) && formNames.includes(mon.form.name.toLowerCase()))

			if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
		} else if (gen || args.includes('individually') || client.config.tracking.forceEverythingSeparately) {
			monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && !mon.form.id
					|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && !mon.form.id
					|| args.includes('everything') && !client.config.tracking.disableEverythingTracking
					|| args.includes('everything') && msg.isFromAdmin) && !mon.form.id)

			if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
		} else {
			monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && !mon.form.id
					|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && !mon.form.id
			) && !mon.form.id)
			if (args.includes('everything') && !client.config.tracking.disableEverythingTracking || args.includes('everything') && msg.isFromAdmin) {
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
			if (element.match(client.re.maxlevelRe)) maxlevel = element.match(client.re.maxlevelRe)[0].replace(client.translator.translate('maxlevel'), '')
			else if (element.match(client.re.templateRe)) template = element.match(client.re.templateRe)[0].replace(client.translator.translate('template'), '')
			else if (element.match(client.re.greatLeagueRe)) greatLeague = element.match(client.re.greatLeagueRe)[0].replace(client.translator.translate('great'), '')
			else if (element.match(client.re.greatLeagueCPRe)) greatLeagueCP = element.match(client.re.greatLeagueCPRe)[0].replace(client.translator.translate('greatcp'), '')
			else if (element.match(client.re.ultraLeagueRe)) ultraLeague = element.match(client.re.ultraLeagueRe)[0].replace(client.translator.translate('ultra'), '')
			else if (element.match(client.re.ultraLeagueCPRe)) ultraLeagueCP = element.match(client.re.ultraLeagueCPRe)[0].replace(client.translator.translate('ultracp'), '')
			else if (element.match(client.re.maxcpRe)) maxcp = element.match(client.re.maxcpRe)[0].replace(client.translator.translate('maxcp'), '')
			else if (element.match(client.re.maxivRe)) maxiv = element.match(client.re.maxivRe)[0].replace(client.translator.translate('maxiv'), '')
			else if (element.match(client.re.maxweightRe)) maxweight = element.match(client.re.maxweightRe)[0].replace(client.translator.translate('maxweight'), '')
			else if (element.match(client.re.maxatkRe)) maxAtk = element.match(client.re.maxatkRe)[0].replace(client.translator.translate('maxatk'), '')
			else if (element.match(client.re.maxdefRe)) maxDef = element.match(client.re.maxdefRe)[0].replace(client.translator.translate('maxdef'), '')
			else if (element.match(client.re.maxstaRe)) maxSta = element.match(client.re.maxstaRe)[0].replace(client.translator.translate('maxsta'), '')
			else if (element.match(client.re.cpRe)) cp = element.match(client.re.cpRe)[0].replace(client.translator.translate('cp'), '')
			else if (element.match(client.re.levelRe)) level = element.match(client.re.levelRe)[0].replace(client.translator.translate('level'), '')
			else if (element.match(client.re.ivRe)) iv = element.match(client.re.ivRe)[0].replace(client.translator.translate('iv'), '')
			else if (element.match(client.re.atkRe)) atk = element.match(client.re.atkRe)[0].replace(client.translator.translate('atk'), '')
			else if (element.match(client.re.defRe)) def = element.match(client.re.defRe)[0].replace(client.translator.translate('def'), '')
			else if (element.match(client.re.staRe)) sta = element.match(client.re.staRe)[0].replace(client.translator.translate('sta'), '')
			else if (element.match(client.re.weightRe)) weight = element.match(client.re.weightRe)[0].replace(client.translator.translate('weight'), '')
			else if (element.match(client.re.dRe)) distance = element.match(client.re.dRe)[0].replace(client.translator.translate('d'), '')
			else if (element === 'female') gender = 2
			else if (element === 'clean') clean = true
			else if (element === 'male') gender = 1
			else if (element === 'genderless') gender = 3
		})
		if (greatLeague < 4096 && ultraLeague < 4096 || greatLeague < 4096 && ultraLeagueCP > 0 || greatLeagueCP > 0 && ultraLeague < 4096 || greatLeagueCP > 0 && ultraLeagueCP > 0) {
			await msg.react(client.translator.translate('🙅'))
			return await msg.reply(`${client.translator.translate('Oops, both Great and Ultra league parameters were set in command! - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}
		if (greatLeague < 4096 && greatLeague > pvpFilterMaxRank) greatLeague = pvpFilterMaxRank
		if (ultraLeague < 4096 && ultraLeague > pvpFilterMaxRank) ultraLeague = pvpFilterMaxRank
		if (greatLeagueCP > 0 && greatLeagueCP <= pvpFilterGreatMinCP) greatLeagueCP = pvpFilterGreatMinCP
		if (ultraLeagueCP > 0 && ultraLeagueCP <= pvpFilterUltraMinCP) ultraLeagueCP = pvpFilterUltraMinCP
		if (greatLeague <= pvpFilterMaxRank && greatLeagueCP === 0) greatLeagueCP = pvpFilterGreatMinCP
		if (ultraLeague <= pvpFilterMaxRank && ultraLeagueCP === 0) ultraLeagueCP = pvpFilterUltraMinCP
		if (greatLeagueCP >= pvpFilterGreatMinCP && greatLeague === 4096) greatLeague = pvpFilterMaxRank
		if (ultraLeagueCP >= pvpFilterUltraMinCP && ultraLeague === 4096) ultraLeague = pvpFilterMaxRank
		if (client.config.tracking.defaultDistance !== 0 && distance === 0 && !msg.isFromAdmin) distance = client.config.tracking.defaultDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance && !msg.isFromAdmin) distance = client.config.tracking.maxDistance
		if (client.config.tracking.maxDistance !== 0 && distance > client.config.tracking.maxDistance) distance = client.config.tracking.maxDistance

		if (distance > 0 && !userHasLocation && !target.webhook) {
			await msg.react(client.translator.translate('🙅'))
			return await msg.reply(`${client.translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !target.webhook) {
			await msg.react(client.translator.translate('🙅'))
			return await msg.reply(`${client.translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}
		const insert = monsters.map((mon) => ({
			id: target.id,
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
		}))
		if (!insert.length) {
			return await msg.reply(client.translator.translate('404 No monsters found'))
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
