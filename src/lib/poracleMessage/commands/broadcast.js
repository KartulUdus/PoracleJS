exports.run = async (client, msg, args, options) => {
	try {
		if (!msg.isFromAdmin) {
			return await msg.react('🙅')
		}

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const matched = []
		let distance
		let latitude
		let longitude

		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.areaRe)) {
				const [,, areaName] = args[i].match(client.re.areaRe)
				matched.push(areaName)
				args.splice(i, 1)
			} else if (args[i].match(client.re.dRe)) {
				[,, distance] = args[i].match(client.re.dRe)
				args.splice(i, 1)
			}
		}

		// search for lat, lon in first parameter
		const matches = args.length && args[0].match(client.re.latlonRe)
		if (matches !== null && matches.length >= 2) {
			latitude = parseFloat(matches[1])
			longitude = parseFloat(matches[2])
			args.splice(0, 1)
		}

		if (!args.length) {
			await msg.reply('Blank message!')
			return
		}

		if (!latitude && !matched) {
			await msg.reply('No location or areas specified')
			return
		}

		if (latitude && !distance) {
			await msg.reply('Location specified without any distance')
			return
		}

		const message = args.join(' ')

		let areastring = '1 = 0 '
		matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area.replace(/'/g, '\\\'')}"%' `)
		})

		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude 
		from humans
		where humans.enabled = 1 and humans.admin_disable = false and humans.type like '%:user'
		and
		(`

		if (latitude) {
			query = query.concat(`

					(
						round(
							6371000
							* acos(
								cos( radians(${latitude}) )
								* cos( radians( humans.latitude ) )
								* cos( radians( humans.longitude ) - radians(${longitude}) )
								+ sin( radians(${latitude}) )
								* sin( radians( humans.latitude ) )
							)
						) < ${distance}
					)
					or
					`)
		}
		query = query.concat(`(${areastring}) 
			
			)`)

		const result = await client.query.misteryQuery(query)

		const job = result.map((row) => ({
			type: row.type,
			target: row.id,
			name: row.name,
			ping: '',
			clean: false,
			message: { content: message },
			logReference: '',
			tth: { hours: 1, minutes: 0, seconds: 0 },
		}))

		client.addToQueue(job)

		const users = result.map((row) => row.name).join(', ')
		await msg.reply(`I sent your message to ${users}`)
		await msg.react('✅')
	} catch (err) {
		client.log.error(`broadcast command ${msg.content} unhappy:`, err)
	}
}
