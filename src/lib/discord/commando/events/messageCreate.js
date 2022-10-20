module.exports = async (client, msg) => {
	try {
		// Ignore all bots
		if (msg.author.bot && !client.config.discord.admins.includes(msg.author.id)) return
		if (msg.webhookID) return

		client.logs.discord.debug(`Received message ${msg.author.username} ${msg.content}`)

		// Log all DM messages to dmLogChannelID
		if (msg.channel.type === 'DM' && client.config.discord.dmLogChannelID !== '') {
			let message = `${msg.author} > ${msg.cleanContent}`
			if (client.config.discord.guilds && client.config.discord.guilds.length > 1) {
				message = `${msg.author.username} ${msg.author} > ${msg.cleanContent}`
			}
			if (client.config.discord.admins.includes(msg.author.id)) {
				message = `**${msg.author.username}** > ${msg.cleanContent}`
			}

			client.channels.fetch(client.config.discord.dmLogChannelID).then(
				(channel) => {
					const msgDeletionMs = (client.config.discord.dmLogChannelDeletionTime * 60) * 1000 || 0
					if (!channel) {
						client.logs.discord.warn('channel dmLogChannel not found')
					} else {
						channel.send(message).then((logmsg) => {
							if (msgDeletionMs > 0) {
								setTimeout(() => {
									logmsg.delete().catch(() => {})
								}, msgDeletionMs)
							}
						}).catch(() => { })
					}
				},
			).catch((err) => {
				client.logs.discord.error('Failed to send Discord alert to dmLogChannel', err)
			})
		}

		let recognisedCommand = false
		if (msg.content.indexOf(client.config.discord.prefix) === 0) {
			for (const commandText of msg.content.split('\n')) {
				// Ignore msgs not starting with the prefix (in config)
				// eslint-disable-next-line no-continue
				if (commandText.indexOf(client.config.discord.prefix) !== 0) continue

				// Regex will split by spaces but keeping quotes as a single string, even if in a substring eg: form:"new form"
				// Remove the quotes

				let args = commandText.slice(client.config.discord.prefix.length)
					.trim()
					.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g)
					.map((x) => x.replace(/"/g, ''))

				// Convert to lower case, translate back to english, and substitute _ for spaces

				args = args.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.toLowerCase()
					.replace(/_/g, ' '), true)
					.toLowerCase())
				const command = args.shift()

				// eslint-disable-next-line no-continue
				if (client.config.general.disabledCommands.includes(command)) continue

				let initialArgs
				if (args.includes('|')) {
					let currentArg = []
					initialArgs = []
					for (const arg of args) {
						if (arg === '|') {
							initialArgs.push(currentArg)
							currentArg = []
						} else {
							currentArg.push(arg)
						}
					}
					initialArgs.push(currentArg)
				} else {
					initialArgs = [args]
				}

				const cmd = client.commands[command]
				if (cmd) {
					recognisedCommand = true
					cmd.run(client, msg, initialArgs)
				}
			}
		}
		if (msg.channel.type === 'DM' && !recognisedCommand && client.config.discord.unrecognisedCommandMessage) {
			msg.reply(client.config.discord.unrecognisedCommandMessage)
		}
	} catch (err) {
		client.logs.discord.error('Error during message event', err)
	}
}
