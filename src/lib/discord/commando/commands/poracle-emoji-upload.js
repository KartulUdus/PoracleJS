const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const PoracleDiscordState = require('../../poracleDiscordState')
const Uicons = require('../../../uicons')

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

		const imgUicons = new Uicons(client.config.general.imgUrl, 'png', client.logs.log)

		if (!await imgUicons.isUiconsRepository()) {
			return await msg.reply('Currently configured imgUrl is not a uicons repository')
		}

		// Load emojis from discord
		const emojis = {}
		for (const emoji of guild.emojis.cache.values()) {
			emojis[emoji.name] = emoji
		}

		// Identify and update poracle emojis
		const poracleEmoji = {}

		const setEmoji = async (name, url) => {
			const discordEmojiName = `poracle-${name}`.replace(/-/g, '_')

			if (url && !url.endsWith('/0.png')) {
				if (emojis[discordEmojiName]) {
					console.log(`emoji url is ${emojis[discordEmojiName].url}`)
					if (emojis[discordEmojiName].url !== url) {
						await emojis[discordEmojiName].delete()
						emojis[discordEmojiName] = await guild.emojis.create(url, discordEmojiName)
					}
				} else {
					console.log(`${url} ${discordEmojiName}`)

					emojis[discordEmojiName] = await guild.emojis.create(url, discordEmojiName)
				}
			}

			if (emojis[discordEmojiName]) {
				poracleEmoji[name] = { name: discordEmojiName, id: emojis[discordEmojiName].id }
			}
		}

		// Types

		for (const type of Object.values(client.GameData.utilData.types)) {
			if (type.emoji) {
				const url = await imgUicons.typeIcon(type.id)
				await setEmoji(url, type.emoji)
			}
		}

		// Weather
		// for (const [id, details] of Object.entries(client.GameData.utilData.weather)) {
		// 	if (details.emoji) {
		// 		const url = await imgUicons.weatherIcon(id)
		// 		await setEmoji(url, details.emoji)
		// 	}
		// }

		// Lure
		for (const [id, details] of Object.entries(client.GameData.utilData.lures)) {
			if (details.emoji) {
				const url = await imgUicons.rewardItemIcon(id)
				await setEmoji(url, details.emoji)
			}
		}

		// Team
		for (const [id, details] of Object.entries(client.GameData.utilData.teams)) {
			if (details.emoji) {
				const url = await imgUicons.teamIcon(id)
				await setEmoji(url, details.emoji)
			}
		}

		let s = '```\n{\n  "discord": {'

		let first = true
		for (const [poracleName, discordDetails] of Object.entries(poracleEmoji)) {
			if (first) { first = false } else { s += ',' }
			s += `"\n    ${poracleName}":"<:${discordDetails.name}:${discordDetails.id}>"`
		}
		s += '\n  }\n}\n```'

		await msg.reply(s)
	} catch (err) {
		await msg.reply('Failed to run emoji upload, check logs')
		client.logs.log.error(`Poracle-emoji-upload command "${msg.content}" unhappy:`, err)
	}
}
