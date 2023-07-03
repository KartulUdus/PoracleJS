const stripJsonComments = require('strip-json-comments')
const fs = require('fs')
const path = require('path')
const { Permissions } = require('discord.js')
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
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type !== 'DM') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		for (const commandText of msg.content.split('\n')) {
			args = commandText.slice(client.config.discord.prefix.length)
				.trim()
				.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g)
				.map((x) => x.replace(/"/g, ''))
			args.shift()
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

		if (!guild.me.permissions.has(Permissions.FLAGS.MANAGE_WEBHOOKS)) {
			return await msg.reply('I have not been allowed to manage webhooks!')
		}
		if (!guild.me.permissions.has(Permissions.FLAGS.MANAGE_CHANNELS)) {
			return await msg.reply('I have not been allowed to manage channels!')
		}

		// Remove arguments that we don't want to keep
		for (let i = args.length - 1; i >= 0; i--) {
			if (args[i].match(client.re.guildRe)) args.splice(i, 1)
		}

		let fileContents
		try {
			fileContents = fs.readFileSync(path.join(__dirname, '../../../../../config/channelTemplate.json'), 'utf8')
		} catch (err) {
			return await msg.reply('Cannot read channelTemplate definition')
		}

		const channelTemplate = JSON.parse(stripJsonComments(fileContents))

		const templateName = args.shift()

		const template = channelTemplate.find((x) => x.name === templateName)
		if (!template || !template.definition) {
			return await msg.reply('I can\'t find that channel template! (remember it has to be your first parameter)')
		}

		// switch underscores back in so works for substitution later
		const subArgs = []
		for (let x = 0; x < args.length; x++) {
			subArgs[x] = args[x].replace(/ /g, '_')
		}

		let categoryId
		if (template.definition.category) {
			const categoryOptions = {
				type: 'GUILD_CATEGORY',
			}

			const categoryName = format(template.definition.category.categoryName, args)

			// add role permissions
			let roleId
			if (template.definition.category.roles) {
				const roleOverwrites = []
				for (const role of template.definition.category.roles) {
					const allowed = []
					const deny = []
					const roleNames = guild.roles.cache.map((r) => r.name)
					const roleIds = guild.roles.cache.map((r) => r.id)
					for (let x = 0; x < roleNames.length; x++) {
						if ((format(role.name, args)) === roleNames[x]) {
							roleId = await guild.roles.cache.get(roleIds[x])
						}
					}
					if (!roleId) {
						roleId = await guild.roles.create({
							name: (format(role.name, args)),
							permissions: [],
						})
					}
					if (role.view) {
						allowed.push('VIEW_CHANNEL')
					} else if (role.view === false) {
						deny.push('VIEW_CHANNEL')
					}
					if (role.viewHistory) {
						allowed.push('READ_MESSAGE_HISTORY')
					} else if (role.viewHistory === false) {
						deny.push('READ_MESSAGE_HISTORY')
					}
					if (role.send) {
						allowed.push('SEND_MESSAGES')
					} else if (role.send === false) {
						deny.push('SEND_MESSAGES')
					}
					if (role.react) {
						allowed.push('ADD_REACTIONS')
					} else if (role.react === false) {
						deny.push('ADD_REACTIONS')
					}
					if (role.pingEveryone) {
						allowed.push('MENTION_EVERYONE')
					} else if (role.pingEveryone === false) {
						deny.push('MENTION_EVERYONE')
					}
					if (role.embedLinks) {
						allowed.push('EMBED_LINKS')
					} else if (role.embedLinks === false) {
						deny.push('EMBED_LINKS')
					}
					if (role.attachFiles) {
						allowed.push('ATTACH_FILES')
					} else if (role.attachFiles === false) {
						deny.push('ATTACH_FILES')
					}
					if (role.sendTTS) {
						allowed.push('SEND_TTS_MESSAGES')
					} else if (role.sendTTS === false) {
						deny.push('SEND_TTS_MESSAGES')
					}
					if (role.externalEmoji) {
						allowed.push('USE_EXTERNAL_EMOJIS')
					} else if (role.externalEmoji === false) {
						deny.push('USE_EXTERNAL_EMOJIS')
					}
					if (role.externalStickers) {
						allowed.push('USE_EXTERNAL_STICKERS')
					} else if (role.externalStickers === false) {
						deny.push('USE_EXTERNAL_STICKERS')
					}
					if (role.createPublicThreads) {
						allowed.push('CREATE_PUBLIC_THREADS')
					} else if (role.createPublicThreads === false) {
						deny.push('CREATE_PUBLIC_THREADS')
					}
					if (role.createPrivateThreads) {
						allowed.push('CREATE_PRIVATE_THREADS')
					} else if (role.createPrivateThreads === false) {
						deny.push('CREATE_PRIVATE_THREADS')
					}
					if (role.sendThreads) {
						allowed.push('SEND_MESSAGES_IN_THREADS')
					} else if (role.sendThreads === false) {
						deny.push('SEND_MESSAGES_IN_THREADS')
					}
					if (role.slashCommands) {
						allowed.push('USE_APPLICATION_COMMANDS')
					} else if (role.slashCommands === false) {
						deny.push('USE_APPLICATION_COMMANDS')
					}
					if (role.connect) {
						allowed.push('CONNECT')
					} else if (role.connect === false) {
						deny.push('CONNECT')
					}
					if (role.speak) {
						allowed.push('SPEAK')
					} else if (role.speak === false) {
						deny.push('SPEAK')
					}
					if (role.autoMic) {
						allowed.push('USE_VAD')
					} else if (role.autoMic === false) {
						deny.push('USE_VAD')
					}
					if (role.stream) {
						allowed.push('STREAM')
					} else if (role.stream === false) {
						deny.push('STREAM')
					}
					/*           if (role.soundboard) {
						allowed.push('USE_SOUNDBOARD')
					} else if (role.soundboard === false) {
						deny.push('USE_SOUNDBOARD')
					} */ // future use, v9 API
					if (role.vcActivities) {
						allowed.push('START_EMBEDDED_ACTIVITIES')
					} else if (role.vcActivities === false) {
						deny.push('START_EMBEDDED_ACTIVITIES')
					}
					if (role.prioritySpeaker) {
						allowed.push('PRIORITY_SPEAKER')
					} else if (role.prioritySpeaker === false) {
						deny.push('PRIORITY_SPEAKER')
					}
					if (role.createInvite) {
						allowed.push('CREATE_INSTANT_INVITE')
					} else if (role.createInvite === false) {
						deny.push('CREATE_INSTANT_INVITE')
					}
					if (role.channels) {
						allowed.push('MANAGE_CHANNELS')
					} else if (role.channels === false) {
						deny.push('MANAGE_CHANNELS')
					}
					if (role.messages) {
						allowed.push('MANAGE_MESSAGES')
					} else if (role.messages === false) {
						deny.push('MANAGE_MESSAGES')
					}
					if (role.roles) {
						allowed.push('MANAGE_ROLES')
					} else if (role.roles === false) {
						deny.push('MANAGE_ROLES')
					}
					if (role.webhooks) {
						allowed.push('MANAGE_WEBHOOKS')
					} else if (role.webhooks === false) {
						deny.push('MANAGE_WEBHOOKS')
					}
					if (role.threads) {
						allowed.push('MANAGE_THREADS')
					} else if (role.threads === false) {
						deny.push('MANAGE_THREADS')
					}
					if (role.events) {
						allowed.push('MANAGE_EVENTS')
					} else if (role.events === false) {
						deny.push('MANAGE_EVENTS')
					}
					if (role.mute) {
						allowed.push('MUTE_MEMBERS')
					} else if (role.mute === false) {
						deny.push('MUTE_MEMBERS')
					}
					if (role.deafen) {
						allowed.push('DEAFEN_MEMBERS')
					} else if (role.deafen === false) {
						deny.push('DEAFEN_MEMBERS')
					}
					if (role.move) {
						allowed.push('MOVE_MEMBERS')
					} else if (role.move === false) {
						deny.push('MOVE_MEMBERS')
					}
					roleOverwrites.push({ id: roleId, allow: allowed, deny })
				}
				categoryOptions.permissionOverwrites = roleOverwrites
			}

			// create category in discord
			const category = await guild.channels.create(categoryName, categoryOptions)
			await msg.reply(`>> Creating ${categoryName}`)
			categoryId = category.id
		}

		for (const channelDefinition of template.definition.channels) {
			const channelOptions = {}
			if (channelDefinition.channelType === 'text') {
				channelOptions.type = 'GUILD_TEXT'
			} else if (channelDefinition.channelType === 'voice') {
				channelOptions.type = 'GUILD_VOICE'
			}
			if (categoryId) {
				channelOptions.parent = categoryId
			}

			if (channelDefinition.topic) {
				channelOptions.topic = format(channelDefinition.topic, args)
			}

			const channelName = format(channelDefinition.channelName, args)

			// add role permissions
			let roleId
			if (channelDefinition.roles) {
				const roleOverwrites = []
				for (const role of channelDefinition.roles) {
					const allowed = []
					const deny = []
					const roleNames = guild.roles.cache.map((r) => r.name)
					const roleIds = guild.roles.cache.map((r) => r.id)
					for (let x = 0; x < roleNames.length; x++) {
						if ((format(role.name, args)) === roleNames[x]) {
							roleId = await guild.roles.cache.get(roleIds[x])
						}
					}
					if (!roleId) {
						roleId = await guild.roles.create({
							name: (format(role.name, args)),
							permissions: [],
						})
					}
					if (role.view) {
						allowed.push('VIEW_CHANNEL')
					} else if (role.view === false) {
						deny.push('VIEW_CHANNEL')
					}
					if (role.viewHistory) {
						allowed.push('READ_MESSAGE_HISTORY')
					} else if (role.viewHistory === false) {
						deny.push('READ_MESSAGE_HISTORY')
					}
					if (role.send) {
						allowed.push('SEND_MESSAGES')
					} else if (role.send === false) {
						deny.push('SEND_MESSAGES')
					}
					if (role.react) {
						allowed.push('ADD_REACTIONS')
					} else if (role.react === false) {
						deny.push('ADD_REACTIONS')
					}
					if (role.pingEveryone) {
						allowed.push('MENTION_EVERYONE')
					} else if (role.pingEveryone === false) {
						deny.push('MENTION_EVERYONE')
					}
					if (role.embedLinks) {
						allowed.push('EMBED_LINKS')
					} else if (role.embedLinks === false) {
						deny.push('EMBED_LINKS')
					}
					if (role.attachFiles) {
						allowed.push('ATTACH_FILES')
					} else if (role.attachFiles === false) {
						deny.push('ATTACH_FILES')
					}
					if (role.sendTTS) {
						allowed.push('SEND_TTS_MESSAGES')
					} else if (role.sendTTS === false) {
						deny.push('SEND_TTS_MESSAGES')
					}
					if (role.externalEmoji) {
						allowed.push('USE_EXTERNAL_EMOJIS')
					} else if (role.externalEmoji === false) {
						deny.push('USE_EXTERNAL_EMOJIS')
					}
					if (role.externalStickers) {
						allowed.push('USE_EXTERNAL_STICKERS')
					} else if (role.externalStickers === false) {
						deny.push('USE_EXTERNAL_STICKERS')
					}
					if (role.createPublicThreads) {
						allowed.push('CREATE_PUBLIC_THREADS')
					} else if (role.createPublicThreads === false) {
						deny.push('CREATE_PUBLIC_THREADS')
					}
					if (role.createPrivateThreads) {
						allowed.push('CREATE_PRIVATE_THREADS')
					} else if (role.createPrivateThreads === false) {
						deny.push('CREATE_PRIVATE_THREADS')
					}
					if (role.sendThreads) {
						allowed.push('SEND_MESSAGES_IN_THREADS')
					} else if (role.sendThreads === false) {
						deny.push('SEND_MESSAGES_IN_THREADS')
					}
					if (role.slashCommands) {
						allowed.push('USE_APPLICATION_COMMANDS')
					} else if (role.slashCommands === false) {
						deny.push('USE_APPLICATION_COMMANDS')
					}
					if (role.connect) {
						allowed.push('CONNECT')
					} else if (role.connect === false) {
						deny.push('CONNECT')
					}
					if (role.speak) {
						allowed.push('SPEAK')
					} else if (role.speak === false) {
						deny.push('SPEAK')
					}
					if (role.autoMic) {
						allowed.push('USE_VAD')
					} else if (role.autoMic === false) {
						deny.push('USE_VAD')
					}
					if (role.stream) {
						allowed.push('STREAM')
					} else if (role.stream === false) {
						deny.push('STREAM')
					}
					/*           if (role.soundboard) {
						allowed.push('USE_SOUNDBOARD')
					} else if (role.soundboard === false) {
						deny.push('USE_SOUNDBOARD')
					} */ // future use, v9 API
					if (role.vcActivities) {
						allowed.push('START_EMBEDDED_ACTIVITIES')
					} else if (role.vcActivities === false) {
						deny.push('START_EMBEDDED_ACTIVITIES')
					}
					if (role.prioritySpeaker) {
						allowed.push('PRIORITY_SPEAKER')
					} else if (role.prioritySpeaker === false) {
						deny.push('PRIORITY_SPEAKER')
					}
					if (role.createInvite) {
						allowed.push('CREATE_INSTANT_INVITE')
					} else if (role.createInvite === false) {
						deny.push('CREATE_INSTANT_INVITE')
					}
					if (role.channels) {
						allowed.push('MANAGE_CHANNELS')
					} else if (role.channels === false) {
						deny.push('MANAGE_CHANNELS')
					}
					if (role.messages) {
						allowed.push('MANAGE_MESSAGES')
					} else if (role.messages === false) {
						deny.push('MANAGE_MESSAGES')
					}
					if (role.roles) {
						allowed.push('MANAGE_ROLES')
					} else if (role.roles === false) {
						deny.push('MANAGE_ROLES')
					}
					if (role.webhooks) {
						allowed.push('MANAGE_WEBHOOKS')
					} else if (role.webhooks === false) {
						deny.push('MANAGE_WEBHOOKS')
					}
					if (role.threads) {
						allowed.push('MANAGE_THREADS')
					} else if (role.threads === false) {
						deny.push('MANAGE_THREADS')
					}
					if (role.events) {
						allowed.push('MANAGE_EVENTS')
					} else if (role.events === false) {
						deny.push('MANAGE_EVENTS')
					}
					if (role.mute) {
						allowed.push('MUTE_MEMBERS')
					} else if (role.mute === false) {
						deny.push('MUTE_MEMBERS')
					}
					if (role.deafen) {
						allowed.push('DEAFEN_MEMBERS')
					} else if (role.deafen === false) {
						deny.push('DEAFEN_MEMBERS')
					}
					if (role.move) {
						allowed.push('MOVE_MEMBERS')
					} else if (role.move === false) {
						deny.push('MOVE_MEMBERS')
					}
					roleOverwrites.push({ id: roleId, allow: allowed, deny })
				}
				channelOptions.permissionOverwrites = roleOverwrites
			}

			// create channel in discord
			const channel = await guild.channels.create(channelName, channelOptions)
			await msg.reply(`>> Creating ${channelName}`)

			// exit loop if simple text channel
			if (!channelDefinition.controlType) {
				// eslint-disable-next-line no-continue
				continue
			}

			const { controlType } = channelDefinition
			await msg.reply(`>> Adding control type: ${controlType}`)

			// register channel in poracle
			let id
			let type
			let name

			if (controlType === 'bot') {
				id = channel.id
				type = 'discord:channel'
				name = format(channelDefinition.channelName, subArgs)
			} else {
				const webhookName = format(channelDefinition.channelName, subArgs)
				const res = await channel.createWebhook('Poracle')
				id = res.url
				type = 'webhook'
				name = channelDefinition.webhookName ? format(channelDefinition.webhookName, subArgs) : webhookName
			}

			// Create
			await client.query.insertQuery('humans', {
				id,
				type,
				name,
				area: '[]',
				community_membership: '[]',
			})

			// Commands

			const commands = channelDefinition.commands.map((x) => format(x, subArgs))

			const pdm = new PoracleDiscordMessage(client, msg)
			const pds = new PoracleDiscordState(client)
			const target = { type, id, name }
			await msg.reply(`>> Executing as ${target.type} / ${target.name} ${target.type !== 'webhook' ? target.id : ''}`)

			for (const commandText of commands) {
				await msg.reply(`>>> Executing ${commandText}`)

				let commandArgs = commandText.trim().split(/ +/g)
				commandArgs = commandArgs.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())

				const cmdName = commandArgs.shift()

				const cmd = require(`../../../poracleMessage/commands/${cmdName}`)

				await cmd.run(
					pds,
					pdm,
					commandArgs,
					{
						targetOverride: target,
					},
				)
			}
		}
	} catch (err) {
		await msg.reply('Failed to run autocreate, check logs')
		client.logs.log.error(`Autocreate command "${msg.content}" unhappy:`, err)
	}
}
