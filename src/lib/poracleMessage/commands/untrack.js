const helpCommand = require('./help.js')

exports.run = async (client, msg, args, options) => {
	try {
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		if (args.length === 0) {
			await msg.reply(translator.translateFormat('Valid commands are e.g. `{0}untrack charmander`, `{0}untrack everything`', util.prefix),
				{ style: 'markdown' })
			if (helpCommand.isHelpAvailable(client, language, target, commandName)) {
				await msg.reply(translator.translateFormat('For more assistance, `{0}{1} {2}`', util.prefix, translator.translate('help'), translator.translate(commandName)))
			} else {
				await msg.reply(translator.translateFormat('For more assistance, `{0}{1}`', util.prefix, translator.translate('help')))
			}
			return
		}

		const typeArray = Object.keys(client.GameData.utilData.types).map((o) => o.toLowerCase())

		const argTypes = args.filter((arg) => typeArray.includes(arg))

		let monsters = []
		monsters = Object.values(client.GameData.monsters).filter((mon) => ((args.includes(mon.name.toLowerCase()) || args.includes(mon.id.toString()))
			|| mon.types.map((t) => t.name.toLowerCase()).find((t) => argTypes.includes(t)) || args.includes('everything'))
			&& !mon.form.id)

		const monsterIds = monsters.map((mon) => mon.id)
		if (args.includes('everything')) {
			monsterIds.push(0)
		}
		const result = await client.query.deleteWhereInQuery('monsters', {
			id: target.id,
			profile_no: currentProfileNo,
		}, monsterIds, 'pokemon_id')
		client.log.info(`${target.name} removed tracking for monsters: ${monsters.map((m) => m.name).join(', ')}`)

		if (result.length || client.config.database.client === 'sqlite') {
			msg.react('✅')
		} else {
			msg.react('👌')
		}
	} catch (err) {
		client.log.error('untrack command unhappy:', err)
	}
}
