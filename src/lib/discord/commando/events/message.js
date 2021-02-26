module.exports = async (client, msg) => {
	try {
		// Ignore all bots
		if (msg.author.bot) return
		if (msg.webhookID) return

		client.logs.discord.debug(`Received message ${msg.author.username} ${msg.content}`)

		// Log all DM messages to dmLogChannelID
		if (msg.channel.type === 'dm' && client.config.discord.dmLogChannelID !== '') {
			let message = `${msg.author} > ${msg.cleanContent}`
			if (client.config.discord.guilds && client.config.discord.guilds.length > 1) {
				message = `${msg.author.username} ${msg.author} > ${msg.cleanContent}`
			}
			if (client.config.discord.admins.includes(msg.author.id)) {
				message = `**${msg.author.username}** > ${msg.cleanContent}`
			}
			try {
				const channel = await client.channels.fetch(client.config.discord.dmLogChannelID)
				const msgDeletionMs = (client.config.discord.dmLogChannelDeletionTime * 60) * 1000 || 0
				if (!channel) {
					client.logs.discord.warn('channel dmLogChannel not found')
				} else {
					const logmsg = await channel.send(message)
					if (msgDeletionMs > 0) {
						logmsg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
					}
				}
			} catch (err) {
				client.logs.discord.error('Failed to send Discord alert to dmLogChannel', err)
			}
		}

		// Ignore msgs not starting with the prefix (in config)
		if (msg.content.indexOf(client.config.discord.prefix) !== 0) return

		let args = msg.content.slice(client.config.discord.prefix.length).trim().split(/ +/g)

		args = args.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())
		const command = args.shift()

		if (client.config.general.disabledCommands.includes(command)) return

		let initialArgs
		if (args.includes('|')) {
			initialArgs = args.join(' ').split('|').map((com) => com.split(' ').filter((a) => a))
		} else {
			initialArgs = [args]
		}

		const cmd = client.commands[command]
		if (!cmd) return

		cmd.run(client, msg, initialArgs)
	} catch (err) {
		client.logs.discord.error('Error during message event', err)
	}
}
