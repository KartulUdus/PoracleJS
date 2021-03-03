exports.run = async (client, msg, args) => {
	try {
		// Check target
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		// Check target
		const confAreas = client.geofence.map((area) => area.name.toLowerCase().replace(/ /gi, '_')).sort()
		const confAreas2 = client.geofence.map((area) => area.name.replace(/ /gi, '_')).sort()
		const confUse = confAreas2.join('\n')

		// Remove arguments that we don't want to keep for area processing
		for (let i = 0; i < args.length; i++) {
			if (args[i].match(client.re.nameRe)) args.splice(i, 1)
			else if (args[i].match(client.re.channelRe)) args.splice(i, 1)
			else if (args[i].match(client.re.userRe)) args.splice(i, 1)
		}

		const areaArgs = args.map((a) => a.replace(/ /g, '_'))
		switch (args[0]) {
			case 'add': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				const oldArea = JSON.parse(human.area.split()).map((area) => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter((x) => areaArgs.includes(x))
				const addAreas = validAreas.filter((x) => !oldArea.includes(x))
				const newAreas = [...oldArea, ...addAreas].filter((area) => confAreas.includes(area)).map((area) => area.replace(/_/g, ' '))
				if (!validAreas.length) {
					return await msg.reply(`${translator.translate('no valid areas there, please use one of')}\n\`\`\`\n${confUse}\`\`\` `, { style: 'markdown' })
				}
				await client.query.updateQuery('humans', { area: JSON.stringify(newAreas) }, { id: target.id })

				if (addAreas.length) {
					await msg.reply(`${translator.translate('Added areas:')} ${addAreas}`)
				} else {
					await msg.react('👌')
				}
				await client.query.updateQuery('profiles', { area: JSON.stringify(newAreas) }, { id: target.id, profile_no: currentProfileNo })

				break
			}
			case 'remove': {
				const human = await client.query.selectOneQuery('humans', { id: target.id })
				const oldArea = JSON.parse(human.area.split()).map((area) => area.replace(/ /gi, '_'))
				const validAreas = confAreas.filter((x) => areaArgs.includes(x))
				const removeAreas = validAreas.filter((x) => oldArea.includes(x))
				const newAreas = [...oldArea].filter((area) => confAreas.includes(area) && !removeAreas.includes(area)).map((area) => area.replace(/_/g, ' '))
				if (!validAreas.length) {
					return await msg.reply(`${translator.translate('no valid areas there, please use one of')}\n\`\`\`\n${confUse}\`\`\` `, { style: 'markdown' })
				}
				await client.query.updateQuery('humans', { area: JSON.stringify(newAreas) }, { id: target.id })

				if (removeAreas.length) {
					await msg.reply(`${translator.translate('Removed areas:')} ${removeAreas}`)
				} else {
					await msg.react('👌')
				}

				await client.query.updateQuery('profiles', { area: JSON.stringify(newAreas) }, { id: target.id, profile_no: currentProfileNo })
				break
			}
			case 'list': {
				await msg.reply(`${translator.translate('Current configured areas are:')}\n\`\`\`\n${confUse}\`\`\` `, { style: 'markdown' })
				break
			}
			default:
		}
	} catch (err) {
		client.log.error(`area command ${msg.content} unhappy:`, err)
	}
}
