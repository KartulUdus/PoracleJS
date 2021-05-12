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

		if (!guild.me.hasPermission('MANAGE_WEBHOOKS')) {
			return await msg.reply('I have not been allowed to manage webhooks!')
		}
		if (!guild.me.hasPermission('MANAGE_CHANNELS')) {
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

		const template = channelTemplate.find((x) => x.name.toLowerCase() === templateName)
		if (!template || !template.definition) {
			return await msg.reply('I can\'t find that channel template! (remember it has to be your first parameter)')
		}

		// switch underscores back in so works for substitution later
		for (let x = 0; x < args.length; x++) {
			args[x] = args[x].replace(/ /g, '_')
		}

		let categoryId
		if (template.definition.category) {
			const category = await guild.channels.create(format(template.definition.category, args), { type: 'category' })
			categoryId = category.id
		}

		for (const channelDefinition of template.definition.channels) {
			const channelOptions = {
				type: 'text',
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
			const allowed = []
			if (channelDefinition.roles) {
				const roleOverwrites = []
				for (const role of channelDefinition.roles) {
					roleId = await guild.roles.cache.get(format(role.id, args))
					if (role.view) allowed.push('VIEW_CHANNEL')
					if (role.viewHistory) allowed.push('READ_MESSAGE_HISTORY')
					if (role.send) allowed.push('SEND_MESSAGES')
					if (role.react) allowed.push('ADD_REACTIONS')
					roleOverwrites.push({ id: roleId, allow: allowed })
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

			const channelType = channelDefinition.controlType
			await msg.reply(`>> Adding control type: ${channelType}`)

			// register channel in poracle
			let id
			let type
			let name

			if (channelType == 'bot') {
				id = channel.id
				type = 'discord:channel'
				name = channel.name
			} else {
				const webhookName = channel.name
				const res = await channel.createWebhook('Poracle')
				const webhookLink = res.url

				id = webhookLink
				type = 'webhook'
				name = channelDefinition.webhookName ? format(channelDefinition.webhookName, args) : webhookName
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

			const commands = channelDefinition.commands.map((x) => format(x, args))

			const pdm = new PoracleDiscordMessage(client, msg)
			const pds = new PoracleDiscordState(client)
			const target = { type, id, name }
			await msg.reply(`>> Executing as ${target.type} / ${target.name} ${target.type != 'webhook' ? target.id : ''}`)

			for (const commandText of commands) {
				await msg.reply(`>>> Executing ${commandText}`)

				let commandArgs = commandText.trim().split(/ +/g)
				commandArgs = commandArgs.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())

				const cmdName = commandArgs.shift()

				const cmd = require(`../../../poracleMessage/commands/${cmdName}`)

				await cmd.run(pds, pdm, commandArgs,
					{
						targetOverride: target,
					})
			}
		}
	} catch (err) {
		await msg.reply('Failed to run autocreate, check logs')
		client.logs.log.error(`Autocreate command "${msg.content}" unhappy:`, err)
	}
}
