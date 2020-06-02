const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, command) => {
	let target = { id: msg.author.id, name: msg.author.tag, webhook: false }
	const [args] = command
	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id)) {
			return client.log.info(`${msg.author.username} ran "${msg.content}" command`)
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

		if (args.includes('remove')) {
			args.splice(args.indexOf('remove'), 1)
			if (!args[0]) return msg.reply(client.translator.translate('Include the name of the backup you want to remove'))
			if (fs.existsSync(path.join(__dirname, '../../../backups', `${args[0]}.json`))) {
				fs.unlinkSync(path.join(__dirname, '../../../backups', `${args[0]}.json`))
				return msg.react(client.translator.translate('✅'))
			}
			return msg.react(client.translator.translate('👌'))
		}

		if (!args[0]) return msg.reply(client.translator.translate(`Your backup needs a name, please run \`${client.config.discord.prefix}backup awesomeFiltersetName\``))
		if (args.includes('list')) return msg.reply(client.translator.translate(`To list existing backups, run \`${client.config.discord.prefix}restore list\``))
		const backup = {
			monsters: await client.query.selectAllQuery('monsters', { id: target.id }),
			raid: await client.query.selectAllQuery('raid', { id: target.id }),
			egg: await client.query.selectAllQuery('egg', { id: target.id }),
			quest: await client.query.selectAllQuery('quest', { id: target.id }),
			invasion: await client.query.selectAllQuery('invasion', { id: target.id }),
			weather: await client.query.selectAllQuery('weather', { id: target.id }),
		}
		backup.monsters.map((x) => x.id = 0)
		backup.raid.map((x) => x.id = 0)
		backup.egg.map((x) => x.id = 0)
		backup.quest.map((x) => x.id = 0)
		backup.invasion.map((x) => x.id = 0)
		backup.weather.map((x) => x.id = 0)

		fs.writeFileSync(path.join(__dirname, '../../../backups', `${args[0]}.json`), JSON.stringify(backup, null, '\t'))
		msg.react(client.translator.translate('✅'))
	} catch (err) {
		client.log.error('Backup command unhappy:', err, err.source, err.error)
	}
}
