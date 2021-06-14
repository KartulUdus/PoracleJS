exports.run = async (client, msg, args, options) => {
	try {
		if (!msg.isFromAdmin) {
			return await msg.react('🙅')
		}

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, language, target,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		await msg.react('✅')

		let humans = await client.query.selectAllQuery('humans', {})

		if (args.includes('disabled')) humans = humans.filter((x) => x.admin_disable === 1)
		if (args.includes('enabled')) humans = humans.filter((x) => x.admin_disable === 0)
		if (args.includes('discord')) humans = humans.filter((x) => x.type.startsWith('discord'))
		if (args.includes('telegram')) humans = humans.filter((x) => x.type.startsWith('telegram'))
		if (args.includes('webhook')) humans = humans.filter((x) => x.type.startsWith('webhook'))
		if (args.includes('user')) humans = humans.filter((x) => x.type.includes('user'))
		if (args.includes('group')) humans = humans.filter((x) => x.type.includes('group'))
		if (args.includes('channel')) humans = humans.filter((x) => x.type.includes('channel'))

		humans.sort((a, b) => {
			const compare = a.type.localeCompare(b.type)
			if (compare === 0) return a.name.localeCompare(b.name)
			return compare
		})

		let response = `${translator.translate('These users are registered with Poracle:')}\n`
		for (const human of humans) {
			if (human.type === 'webhook') {
				response = response.concat(`${human.type} \u2022 ${human.name}${human.admin_disable ? ' \uD83D\uDEAB' : ''}\n`)
			} else {
				response = response.concat(`${human.type} \u2022 ${human.name} | (${human.id}) ${human.community_membership} ${human.admin_disable ? ' \uD83D\uDEAB' : ''}\n`)
			}
		}
		await msg.reply(response)
	} catch (err) {
		client.log.error(`userlist command ${msg.content} unhappy:`, err)
	}
}
