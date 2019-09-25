exports.run = async (client, msg, args) => {
	const typeArray = Object.keys(client.utilData.types).map(o => o.toLowerCase())
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send('Please run commands in Direct Messages')
		}
		let webhookName = args.find(arg => arg.match(/name\S+/gi))
		if (webhookName) webhookName = webhookName.replace('name', '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) {
			target = { name: webhookName.replace(/name/gi, ''), webhook: true }
			msg.content = msg.content.replace(client.hookRegex, '')
		}


		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'}  add <Your-Webhook-url>`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {})
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}
		if (target.webhook) target.id = isRegistered.id

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
		let template = 1
		let clean = false
		let pings = ''

		// Check for monsters or forms
		const formNames = args.filter(arg => arg.match(/form\S/gi)).map(arg => arg.replace('form', ''))
		const argTypes = args.filter(arg => typeArray.includes(arg))
		const genCommand = args.filter(arg => arg.match(/gen[1-7]/gi)) 
		const gen = genCommand.length ? client.utilData.genData[+genCommand[0].replace(/gen/gi, '')] : 0

		if (formNames.length) {
			monsters = Object.values(client.monsters).filter(mon => (args.includes(mon.name.toLowerCase()) && formNames.includes(mon.form.name.toLowerCase())
			|| mon.types.map(t => t.name.toLowerCase()).find(t => argTypes.includes(t)) && formNames.includes(mon.form.name.toLowerCase())
			|| args.includes('everything'))	&& formNames.includes(mon.form.name.toLowerCase()) )
		} else {
			monsters = Object.values(client.monsters).filter(mon => (args.includes(mon.name.toLowerCase()) && !mon.form.id
			|| mon.types.map(t => t.name.toLowerCase()).find(t => argTypes.includes(t)) && !mon.form.id
			|| args.includes('everything'))	&& !mon.form.id)
		}
		if (gen) monsters = monsters.filter(mon => mon.id >= gen.min && mon.id <= gen.max)

		// Parse command elements to stuff
		args.forEach((element) => {
			if (element.match(/maxlevel\d{1,2}/gi)) maxlevel = element.match(/maxlevel\d{1,2}/gi)[0].replace(/maxlevel/gi, '')
			else if (element.match(/template\d{1,4}/gi)) template = element.match(/template\d{1,4}/gi)[0].replace(/template/gi, '')
			else if (element.match(/maxcp\d{1,5}/gi)) maxcp = element.match(/maxcp\d{1,5}/gi)[0].replace(/maxcp/gi, '')
			else if (element.match(/maxiv\d{1,3}/gi)) maxiv = element.match(/maxiv\d{1,3}/gi)[0].replace(/maxiv/gi, '')
			else if (element.match(/maxweight\d{1,6}/gi)) maxweight = element.match(/maxweight\d{1,6}/gi)[0].replace(/maxweight/gi, '')
			else if (element.match(/maxatk\d{1,2}/gi)) maxAtk = element.match(/maxatk\d{1,2}/gi)[0].replace(/maxatk/gi, '')
			else if (element.match(/maxdef\d{1,2}/gi)) maxDef = element.match(/maxdef\d{1,2}/gi)[0].replace(/maxdef/gi, '')
			else if (element.match(/maxsta\d{1,2}/gi)) maxSta = element.match(/maxsta\d{1,2}/gi)[0].replace(/maxsta/gi, '')
			else if (element.match(/cp\d{1,5}/gi)) cp = element.match(/cp\d{1,5}/gi)[0].replace(/cp/gi, '')
			else if (element.match(/level\d{1,2}/gi)) level = element.match(/level\d{1,2}/gi)[0].replace(/level/gi, '')
			else if (element.match(/iv\d{1,3}/gi)) iv = element.match(/iv\d{1,3}/gi)[0].replace(/iv/gi, '')
			else if (element.match(/atk\d{1,2}/gi)) atk = element.match(/atk\d{1,2}/gi)[0].replace(/atk/gi, '')
			else if (element.match(/def\d{1,2}/gi)) def = element.match(/def\d{1,2}/gi)[0].replace(/def/gi, '')
			else if (element.match(/sta\d{1,2}/gi)) sta = element.match(/sta\d{1,2}/gi)[0].replace(/sta/gi, '')
			else if (element.match(/weight\d{1,2}/gi)) weight = element.match(/weight\d{1,2}/gi)[0].replace(/weight/gi, '')
			else if (element.match(/d\d{1,8}/gi)) distance = element.match(/d\d{1,8}/gi)[0].replace(/d/gi, '')
			else if (element.endsWith('ping')) 	pings = pings.concat(element.slice(0, element.length - 'ping'.length))
			else if (element === 'female') gender = 2
			else if (element === 'clean') clean = true
			else if (element === 'male') gender = 1
			else if (element === 'genderless') gender = 3
		})
		const insert = monsters.map(mon => ({
			id: target.id,
			pokemon_id: mon.id,
			ping: pings.lenght? pings: '""',
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
		}))

		const result = await client.query.insertOrUpdateQuery('monsters', insert)
		result.length ? msg.react('✅') : msg.react('👌')
	} catch (err) {
		client.log.error('Track command unhappy:', err)
	}
}