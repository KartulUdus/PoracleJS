exports.run = async (client, msg, commands) => {
	try {
		if (!msg.isFromAdmin) {
			return await msg.react('🙅')
		}

		const targets = []
		for (const channel of commands[0]) {
			const humansById = await client.query.selectOneQuery('humans', { id: channel })
			if (humansById) targets.push(humansById)
			const webhookByName = await client.query.selectAllQuery('humans', (builder) => {
				builder.whereIn('type',
					['webhook', 'discord:channel', 'telegram:channel', 'telegram:group'])
					.andWhere('name', 'like', channel)
			})
			if (webhookByName) targets.push(...webhookByName)
		}

		for (const target of targets) {
			await msg.reply(`>>> Executing as ${target.type} / ${target.name} ${target.type != 'webhook' ? target.id : ''}`)
			for (let x = 1; x < commands.length; x++) {
				const command = commands[x]
				await msg.reply(`>> ${command.map((z) => z.replace(/ /g, '_')).join(' ')}`)
				const cmdName = command[0]

				try {
					const cmd = require(`../commands/${cmdName}`)

					await cmd.run(client, msg, command.slice(1),
						{
							targetOverride: {
								type: target.type,
								id: target.id,
								name: target.name,
							},
						})
				} catch (err) {
					await msg.reply('>> Error executing command')
				}
			}
		}
		await msg.react('✅')
	} catch (err) {
		client.log.error(`apply command ${msg.content} unhappy:`, err)
	}
}
