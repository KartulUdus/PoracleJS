exports.run = async (client, msg, command) => {
	const typeArray = Object.keys(client.utilData.types).map((o) => o.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((args) => args.find((arg) => arg.match(client.re.nameRe)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(client.translator.translate('name'), ''), webhook: true }

		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('webhook')} ${client.translator.translate('add')} ${client.translator.translate('<Your-Webhook-url>')}`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.translator.translate('channel')} ${client.translator.translate('add')}`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return await msg.react(client.translator.translate('🙅'))
		}
		if (target.webhook) target.id = isRegistered.id

		let reaction = '👌'
		let validTracks = 0
		for (const args of command) {
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
			let template = 1
			let clean = false
			const pings = [...msg.mentions.users.array().map((u) => `<@!${u.id}>`), ...msg.mentions.roles.array().map((r) => `<@&${r.id}>`)].join('')

			// Check for monsters or forms
			const formArgs = args.filter((arg) => arg.match(client.re.formRe))
			const formNames = formArgs ? formArgs.map((arg) => client.translator.reverse(arg.replace(client.translator.translate('form'), ''))) : []
			const argTypes = args.filter((arg) => typeArray.includes(arg))
			const genCommand = args.filter((arg) => arg.match(client.re.genRe))
			const gen = genCommand.length ? client.utilData.genData[+genCommand[0].replace(client.translator.translate('gen'), '')] : 0

			if (formNames.length) {
				monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && formNames.includes(mon.form.name.toLowerCase())
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && formNames.includes(mon.form.name.toLowerCase())
				|| args.includes(client.translator.translate('everything'))) && formNames.includes(mon.form.name.toLowerCase()))
			} else {
				monsters = Object.values(client.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString())) && !mon.form.id
				|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) && !mon.form.id
				|| args.includes(client.translator.translate('everything'))) && !mon.form.id)
			}
			if (gen) monsters = monsters.filter((mon) => mon.id >= gen.min && mon.id <= gen.max)
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
				break
			} else {
				validTracks += 1
			}
			const result = await client.query.insertOrUpdateQuery('monsters', insert)
			reaction = result.length || client.config.database.client === 'sqlite' ? '✅' : reaction
			client.log.info(`${target.name} started tracking monsters: ${monsters.map((m) => m.name).join(', ')}`)
		}
		if (!validTracks) return await msg.reply(client.translator.translate('404 No monsters found'))
		await msg.react(reaction)
	} catch (err) {
		client.log.error('Track command unhappy:', err)
	}
}
