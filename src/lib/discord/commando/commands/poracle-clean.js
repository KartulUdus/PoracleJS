exports.run = async (client, msg) => {
	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		const limit = 100
		const messages = await msg.channel.messages.fetch({ limit })

		const startMessage = await msg.reply(`Will start cleaning up to ${limit} messages back - do not re-run until finished`)
		for (const message of messages.values()) {
			if (message.author.id === msg.client.user.id) {
				await message.delete({ timeout: 1 })
			}
		}

		startMessage.delete()
		msg.reply('Cleaning finished')
	} catch (err) {
		await msg.reply('Failed to run clean, check logs')
		client.logs.log.error(`Poracle-clean command "${msg.content}" unhappy:`, err)
	}
}
