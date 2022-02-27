const path = require('path')
const fs = require('fs')
const { Permissions } = require('discord.js')
const Uicons = require('../../../uicons')

exports.run = async (client, msg, [args]) => {
	try {
		if (!client.config.discord.admins.includes(msg.author.id)) return

		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'GUILD_TEXT') {
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

		if (!guild.me.permissions.has(Permissions.FLAGS.MANAGE_EMOJIS_AND_STICKERS)) {
			return await msg.reply('I have not been allowed to manage emojis and stickers!')
		}

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

		const upload = args.find((x) => x === 'upload')
		const overwrite = args.find((x) => x === 'overwrite')

		if (upload) {
			await msg.reply('Beginning upload of emojis, this may take a little while. Don\'t run a second time unless you are told it is finished!')
		}

		const setEmoji = async (url, name) => {
			const discordEmojiName = `poracle-${name}`.replace(/-/g, '_')

			if (url) {
				if (!url.endsWith('/0.png')) {
					if (emojis[discordEmojiName] && overwrite) {
						await emojis[discordEmojiName].delete()
					}

					if (!emojis[discordEmojiName] || overwrite) {
						await msg.reply(`Uploading ${discordEmojiName} from ${url}`)

						emojis[discordEmojiName] = await guild.emojis.create(url, discordEmojiName)
					}
				} else {
					await msg.reply(`Repository does not have a suitable emoji for ${discordEmojiName}`)
				}
			}

			if (emojis[discordEmojiName]) {
				poracleEmoji[name] = { name: discordEmojiName, id: emojis[discordEmojiName].id }
			}
		}

		// Types

		for (const type of Object.values(client.GameData.utilData.types)) {
			if (type.emoji) {
				const url = upload ? await imgUicons.typeIcon(type.id) : null
				await setEmoji(url, type.emoji)
			}
		}

		// Weather
		for (const [id, details] of Object.entries(client.GameData.utilData.weather)) {
			if (details.emoji) {
				const url = upload ? await imgUicons.weatherIcon(id) : null
				await setEmoji(url, details.emoji)
			}
		}

		// Lure
		for (const [id, details] of Object.entries(client.GameData.utilData.lures)) {
			if (details.emoji) {
				const url = upload ? await imgUicons.rewardItemIcon(id) : null
				await setEmoji(url, details.emoji)
			}
		}

		// Team
		for (const [id, details] of Object.entries(client.GameData.utilData.teams)) {
			if (details.emoji) {
				const url = upload ? await imgUicons.teamIcon(id) : null
				await setEmoji(url, details.emoji)
			}
		}

		let s = '{\n  "discord": {'

		let first = true
		for (const [poracleName, discordDetails] of Object.entries(poracleEmoji)) {
			if (first) { first = false } else { s += ',' }
			s += `\n    "${poracleName}":"<:${discordDetails.name}:${discordDetails.id}>"`
		}
		s += '\n  }\n}\n'

		const filepath = path.join(__dirname, './emoji.json')
		fs.writeFileSync(filepath, s)
		await msg.reply({ content: 'Here\'s a nice new emoji.json for you!', files: [filepath] })
		fs.unlinkSync(filepath)
	} catch (err) {
		await msg.reply('Failed to run emoji upload, check logs')
		client.logs.log.error(`Poracle-emoji command "${msg.content}" unhappy:`, err)
	}
}
