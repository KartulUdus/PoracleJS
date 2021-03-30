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

		const { guild } = msg

		if (!guild.me.hasPermission('MANAGE_WEBHOOKS')) {
			return await msg.reply('I have not been allowed to manage webhooks!')
		}
		if (!guild.me.hasPermission('MANAGE_CHANNELS')) {
			return await msg.reply('I have not been allowed to manage channels!')
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

			// create channel in discord
			const channel = await guild.channels.create(channelName, channelOptions)
			await msg.reply(`>> Creating ${channelName}`)

			// add role permissions
			let role
			if (channelDefinition.roles) {
				for (const roleId of channelDefinition.roles) {
					role = await guild.roles.cache.get(roleId)
					await channel.updateOverwrite(role, { VIEW_CHANNEL: true })
				}
			}

			// exit loop if simple text channel
			if (!channelDefinition.controlType) {
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
				name = webhookName
			}

			// Create
			await client.query.insertQuery('humans', {
				id,
				type,
				name,
				area: '[]',
//				community_membership: '[]',
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
		client.logs.log.error(`Autocreate command "${msg.content}" unhappy:`, err)
	}
}
