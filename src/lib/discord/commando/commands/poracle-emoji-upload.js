const stripJsonComments = require('strip-json-comments')
const fs = require('fs')
const path = require('path')
const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const PoracleDiscordState = require('../../poracleDiscordState')

function format(str, args) {
	let newStr = str
	let i = args.length
	while (i--) {
		newStr = newStr.replace(new RegExp(`\\{${i}\\}`, 'gm'), args[i])
	}
	return newStr
}

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

		// if (!guild.me.hasPermission('MANAGE_WEBHOOKS')) {
		// 	return await msg.reply('I have not been allowed to manage webhooks!')
		// }
		// if (!guild.me.hasPermission('MANAGE_CHANNELS')) {
		// 	return await msg.reply('I have not been allowed to manage channels!')
		// }

		// const res = await guild.emojis.create('https://i.imgur.com/w3duR07.png', 'rip')
		// console.log(res)
		// await msg.reply(`Created new emoji ${res.name} ${res.id}`)

		const emojis = {}
		let s = '```\n'
		for (const emoji of guild.emojis.cache.values()) {
			s += `fred - "<:${emoji.name}:${emoji.id}>"\n`
			emojis[emoji.name] = emoji
		}
		s += '\n```'

		await msg.reply(s)

		// can't change url - logic should be to check the URL and change only if URL is different
		// await emojis.rip.edit({ url: 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Images/Pokemon%20-%20256x256/Addressable%20Assets/pm1.cJAN_2020_NOEVOLVE.icon.png' })
	} catch (err) {
		await msg.reply('Failed to run emoji upload, check logs')
		client.logs.log.error(`Poracle-emoji-upload command "${msg.content}" unhappy:`, err)
	}
}
