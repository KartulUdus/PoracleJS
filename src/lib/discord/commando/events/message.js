const { log } = require('../../../logger')

module.exports = async (client, msg) => {
	// Ignore all bots
	if (msg.author.bot) return

	// Log all DM messages to dmLogChannelID
	if (msg.channel.type === "dm" && client.config.discord.dmLogChannelID !== "") {
		const message = `${msg.author.username} <@${msg.author.id}> > ${msg.cleanContent}`
		try {
			const channel = await client.channels.fetch(client.config.discord.dmLogChannelID)
			const msgDeletionMs = (client.config.discord.dmLogChannelDeletionTime * 60) * 1000 || 0
			if (!channel) {
				log.warn(`channel dmLogChannel not found`)
			} else {
				const logmsg = await channel.send(message, {"allowedMentions": { "users" : []}})
				if (msgDeletionMs > 0) {
					logmsg.delete({ timeout: msgDeletionMs, reason: 'Removing old stuff.' })
				}
			}
		} catch (err) {
			log.error(`Failed to send Discord alert to dmLogChannel`, err)
		}
	}

	// Ignore msgs not starting with the prefix (in config)
	if (msg.content.indexOf(client.config.discord.prefix) !== 0) return

	let args = msg.content.slice(client.config.discord.prefix.length).trim().split(/ +/g)
	args = args.map((arg) => client.translator.reverse(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())
	const command = client.translator.reverse(args.shift().toLowerCase())

	if (client.config.general.disabledCommands.includes(command)) return

	let initialArgs
	if (args.includes('|')) {
		initialArgs = args.join(' ').split('|').map((com) => com.split(' ').filter((a) => a))
	} else {
		initialArgs = [args]
	}

	const cmd = client.commands.get(command)
	if (!cmd) return

	cmd.run(client, msg, initialArgs)
}
