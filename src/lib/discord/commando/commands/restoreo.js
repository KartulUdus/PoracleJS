const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, command) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }
	const [args] = command

	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}
		let webhookName
		const webhookArray = command.find((argss) => argss.find((arg) => arg.match(client.re.nameRe)))
		if (webhookArray) webhookName = webhookArray.find((arg) => arg.match(client.re.nameRe))
		if (webhookName) webhookName = webhookName.replace(client.translator.translate('name'), '')
		if (client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name, webhook: false }
		if (client.config.discord.admins.includes(msg.author.id) && webhookName) target = { name: webhookName.replace(client.translator.translate('name'), ''), webhook: true }
		const isRegistered = target.webhook
			? await client.query.selectOneQuery('humans', { name: target.name, type: 'webhook' })
			: await client.query.countQuery('humans', { id: target.id })

		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && target.webhook) {
			return await msg.reply(`Webhook ${target.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.config.commands.webhook ? client.config.commands.webhook : 'webhook'} ${client.translator.translate('add')} <Your-Webhook-url>`)
		}
		if (!isRegistered && client.config.discord.admins.includes(msg.author.id) && msg.channel.type === 'text') {
			return await msg.reply(`${msg.channel.name} ${client.translator.translate('does not seem to be registered. add it with')} ${client.config.discord.prefix}${client.config.commands.channel ? client.config.commands.channel : 'channel'} ${client.translator.translate('add')}`)
		}
		if (!isRegistered && msg.channel.type === 'dm') {
			return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}${client.config.commands.poracle ? client.config.commands.poracle : 'poracle'} to #${client.config.discord.channel}`)
		}
		if (target.webhook) target.id = isRegistered.id

		const backupFiles = fs.readdirSync(path.join(__dirname, '../../../backups')).map((file) => file.split('.')[0])

		if (args.includes('list')) {
			return msg.reply(`${client.translator.translate('Available backups are')} \`\`\`\n${backupFiles.join(',\n')}\`\`\``)
		}
		if (!backupFiles.includes(args[0])) {
			return msg.reply(`${args[0]} ${client.translator.translate('is not an existing backup \n')}${client.translator.translate('Available backups are')} \`\`\`\n${backupFiles.join(',\n')}\`\`\``)
		}
		const backup = require(path.join(__dirname, '../../../backups', `${args[0]}.json`))
		for (const key in backup) {
			if (Object.prototype.hasOwnProperty.call(backup, key)) {
				backup[key].map((track) => track.id = target.id)
				if (backup[key].length) await client.query.insertOrUpdateQuery(key, backup[key])
			}
		}
		return msg.react(client.translator.translate('✅'))
	} catch (err) {
		client.log.error('restore command unhappy:', err, err.source, err.error)
	}
}