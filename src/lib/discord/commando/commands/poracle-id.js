const path = require('path')
const fs = require('fs')

exports.run = async (client, msg, [args]) => {
	try {
		if (!client.config.discord.admins.includes(msg.author.id)) return

		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		let { guild } = msg

		let guildIdOverride = args.find((arg) => arg.match(client.re.guildRe))
		if (guildIdOverride) [, , guildIdOverride] = guildIdOverride.match(client.re.guildRe)

		if (guildIdOverride) {
			try {
				guild = await msg.client.guilds.fetch(guildIdOverride)
			} catch {
				return await msg.reply('I was not able to retrieve that guild')
			}
		}

		if (!guild) {
			return await msg.reply('No guild has been set, either execute inside a channel or specify guild<id>')
		}

		let details = ''
		// Load emojis from discord
		for (const emoji of guild.emojis.cache.values()) {
			details += `  "${emoji.name}":"<${emoji.animated ? 'a' : ''}:${emoji.name}:${emoji.id}>"\n`
		}

		details += '\n\n'
		// Load roles from discord

		for (const role of guild.roles.cache.values()) {
			details += `  "${role.name}":"${role.id}"\n`
		}

		const filepath = path.join(__dirname, './id.txt')
		fs.writeFileSync(filepath, details)
		await msg.reply({ content: 'Here\'s your guild ids!', files: [filepath] })
		fs.unlinkSync(filepath)
	} catch (err) {
		await msg.reply('Failed to run emoji upload, check logs')
		client.logs.log.error(`Poracle-emoji command "${msg.content}" unhappy:`, err)
	}
}
