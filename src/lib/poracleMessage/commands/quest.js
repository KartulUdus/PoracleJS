exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

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
				energyMonster = Object.values(client.GameData.monsters).filter((mon) => energyMonster.includes(mon.name.toLowerCase()) && mon.form.id === 0)
				energyMonster = energyMonster.map((mon) => mon.id)
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
		if (distance === 0 && !userHasArea && !remove) {
			await msg.react(translator.translate('🙅'))
			return await msg.reply(`${translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${translator.translate('help')}\``)
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
			const result = await client.query.insertOrUpdateQuery('quest', questTracks)
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			client.log.info(`${target.name} added quest trackings`)
		} else {
			// in case no items or pokemon are in the command, add a dummy 0 to not break sql
			items.push(0)
			monsters.push(0)
			energyMonsters.push(10000)
			const remQuery = `
				delete from quest WHERE id=${target.id} and profile_no=${currentProfileNo} and
				((reward_type = 2 and reward in(${items})) or (reward_type = 7 and reward in(${monsters})) or (reward_type = 3 and reward > ${stardustTracking}) or (reward_type = 12 and reward in(${energyMonsters})) or (reward_type = 12 and ${commandEverything}=1))
				`
			const result = await client.query.misteryQuery(remQuery)
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
		}
		await msg.react(reaction)
	} catch (err) {
		client.log.error('Quest command unhappy:', err)
	}
}
