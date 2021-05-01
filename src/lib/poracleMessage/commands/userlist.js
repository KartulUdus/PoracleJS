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

		const filterString = {}
		if (args[0] === 'disabled') {
			filterString.admin_disable = 1
		}
		if (args[0] === 'enabled') {
			filterString.admin_disable = 0
		}

		const humans = await client.query.selectAllQuery('humans', filterString)
		let response = `${translator.translate('These users are registered with Poracle:')}\n`
		for (const human of humans) {
			if (human.type === 'webhook') {
				response = response.concat(`${human.type} \u2022 ${human.name}${human.admin_disable ? ' \uD83D\uDEAB' : ''}\n`)
			} else {
				response = response.concat(`${human.type} \u2022 ${human.name} | (${human.id}) ${human.community_membership} ${human.admin_disable ? ' \uD83D\uDEAB' : ''}\n`)
			}
			if (response.length > 900) {
				await msg.reply(response)
				response = ''
			}
		}
		await msg.reply(response)
	} catch (err) {
		client.log.error(`userlist command ${msg.content} unhappy:`, err)
	}
}
