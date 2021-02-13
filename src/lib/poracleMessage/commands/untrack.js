exports.run = async (client, msg, args) => {
	try {
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return

		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)
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
