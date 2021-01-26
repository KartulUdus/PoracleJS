exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, userHasLocation, userHasArea,
		} = await util.buildTarget(args)

		if (!canContinue) return

		const typeArray = Object.keys(client.utilData.types).map((o) => o.toLowerCase())
		let reaction = '👌'

		const pings = msg.getPings()
		let monsters = []
		let fullMonsters = []
		let items = []
		let distance = 0
		const questTracks = []
		let template = 1
		let mustShiny = 0
		let remove = false
		let minDust = 10000000
		let stardustTracking = 9999999
		const energyMonsters = []
		let energyMonster = 0
		let commandEverything = 0
		let clean = false

		const argTypes = args.filter((arg) => typeArray.includes(arg))
		const genCommand = args.filter((arg) => arg.match(client.re.genRe))
		const gen = genCommand.length ? client.utilData.genData[+genCommand[0].replace(client.translator.translate('gen'), '')] : 0

		fullMonsters = Object.values(client.monsters).filter((mon) => (
			(args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
			|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t))
			|| args.includes('all pokemon')) && !mon.form.id)
		if (gen) fullMonsters = fullMonsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
		monsters = fullMonsters.map((mon) => mon.id)
		items = Object.keys(client.utilData.items).filter((key) => args.includes(client.translator.translate(client.utilData.items[key].toLowerCase())) || args.includes('all items'))
		if (args.includes('everything') && !client.config.tracking.disableEverythingTracking
			|| args.includes('everything') && msg.isFromAdmin) {
			monsters = Object.values(client.monsters).filter((mon) => !mon.form.id).map((m) => m.id)
			items = Object.keys(client.utilData.items)
			minDust = 0
			stardustTracking = -1
			energyMonsters.push('0')
			commandEverything = 1
		}
		args.forEach((element) => {
			if (element.match(client.re.templateRe)) template = element.match(client.re.templateRe)[0].replace(client.translator.translate('template'), '')
			else if (element.match(client.re.stardustRe)) {
				minDust = +element.match(client.re.stardustRe)[0].replace(client.translator.translate('stardust'), '')
				stardustTracking = -1
			} else if (element.match(client.re.dRe)) distance = element.match(client.re.dRe)[0].replace(client.translator.translate('d'), '')
			else if (element === 'stardust') {
				minDust = 0
				stardustTracking = -1
			} else if (element.match(client.re.energyRe)) {
				energyMonster = element.match(client.re.energyRe)[0].replace(client.translator.translate('energy'), '')
				energyMonster = client.translator.reverse(energyMonster.toLowerCase(), true).toLowerCase()
				energyMonster = Object.values(client.monsters).filter((mon) => energyMonster.includes(mon.name.toLowerCase()) && mon.form.id === 0)
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
			await msg.react(client.translator.translate('🙅'))
			return await msg.reply(`${client.translator.translate('Oops, a distance was set in command but no location is defined for your tracking - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}
		if (distance === 0 && !userHasArea && !remove) {
			await msg.react(client.translator.translate('🙅'))
			return await msg.reply(`${client.translator.translate('Oops, no distance was set in command and no area is defined for your tracking - check the')} \`${util.prefix}${client.translator.translate('help')}\``)
		}

		if (+minDust < 10000000) {
			questTracks.push({
				id: target.id,
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
			return await msg.reply(client.translator.translate('404 No valid quests found'))
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
				delete from quest WHERE id=${target.id} and
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
