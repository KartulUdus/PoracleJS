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
		let response = ''
		for (const human of humans) {
			if (human.type === 'webhook') {
				response = response.concat(`${human.type} • ${human.name}${human.admin_disable ? ' \u1F6AB' : ''}\n`)
			} else {
				response = response.concat(`${human.type} • ${human.name} | ${human.id}${human.admin_disable ? ' \u1F6AB' : ''}\n`)
			}
		}
		await msg.reply(`${translator.translate('These users are registered with Poracle:')}\n${response}`)
	} catch (err) {
		client.log.error(`userlist command ${msg.content} unhappy:`, err)
	}
}
