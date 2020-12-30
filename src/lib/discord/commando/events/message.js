module.exports = (client, msg) => {
	// Ignore all bots
	if (msg.author.bot) return

	// echo everything send to bot to special debug channel
	if (msg.channel.type === "dm" && client.config.discord.echoChannel !== "") {
		client.channels.cache.get(client.config.discord.echoChannel).send("[<@"+msg.author+">] " + msg.cleanContent)
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
