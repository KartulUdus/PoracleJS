const PoracleDiscordMessage = require('../../poracleDiscordMessage')
const PoracleDiscordState = require('../../poracleDiscordState')

//const channelTemplates = require('../../../../../config/channelTemplate.json')

exports.run = async (client, msg, [args]) => {
	try {
		if (!client.config.discord.admins.includes(msg.author.id)) return

		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		if (!msg.guild.me.hasPermission('MANAGE_WEBHOOKS')) {
			return await msg.reply('I have not been allowed to make webhooks!')
		}
		if (!msg.guild.me.hasPermission('MANAGE_CHANNELS')) {
			return await msg.reply('I have not been allowed to manage channels!')
		}

		const category = await msg.guild.channels.create('Category', { type: 'category' })

		const channel = await msg.guild.channels.create('new-channel', {
			parent: category.id,
			type: 'text',
		})

		// await channel.setParent(category)
		await channel.setTopic('Auto created by PoracleJS')

		let id
		let type
		let name

		const channelType = 'bot'
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
			community_membership: '[]',
		})

		// Commands

		const commands = [
			'area add canterbury',
			'track everything iv100',
		]

		const pdm = new PoracleDiscordMessage(client, msg)
		const pds = new PoracleDiscordState(client)

		for (const commandText of commands) {
			let commandArgs = commandText.trim().split(/ +/g)
			commandArgs = commandArgs.map((arg) => client.translatorFactory.reverseTranslateCommand(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())

			const cmdName = commandArgs.shift()

			const cmd = require(`../../../poracleMessage/commands/${cmdName}`)

			await cmd.run(pds, pdm, commandArgs,
				{
					targetOverride: {
						type,
						id,
						name,
					},
				})
		}
	} catch (err) {
		client.logs.log.error(`Autocreate command "${msg.content}" unhappy:`, err)
	}
}
