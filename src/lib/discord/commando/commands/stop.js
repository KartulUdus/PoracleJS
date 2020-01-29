const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, [args]) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }


	try {


		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }

		const isRegistered = await client.query.countQuery('humans', { id: target.id })


		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.config.commands.channel ? client.config.commands.channel : 'channel'} ${client.translator.translate('add')}`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}

		if (isRegistered) {
			await client.query.updateQuery('humans', { enabled: false }, { id: target.id })

			await msg.react('✅')
		}

	} catch (err) {
		client.log.error(`${msg.content} command unhappy: `, err)
	}
}
