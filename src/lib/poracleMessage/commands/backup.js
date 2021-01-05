const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, args) => {
	try {
		// Check target
		if (!msg.isFromAdmin) {
			return client.log.info(`${msg.userId} ran "backup" command`)
		}

		const util = client.createUtil(msg, args)

		const {
			canContinue, target, isRegistered, userHasLocation, userHasArea,
		} = await util.buildTarget(args)

		if (!canContinue) return

		if (args.includes('remove')) {
			args.splice(args.indexOf('remove'), 1)
			if (!args[0]) return msg.reply(client.translator.translate('Include the name of the backup you want to remove'))
			if (fs.existsSync(path.join(__dirname, '../../../../backups', `${args[0]}.json`))) {
				fs.unlinkSync(path.join(__dirname, '../../../../backups', `${args[0]}.json`))
				return msg.react(client.translator.translate('✅'))
			}
			return msg.react(client.translator.translate('👌'))
		}

		if (!args[0]) return msg.reply(client.translator.translate(`Your backup needs a name, please run \`${util.prefix}backup awesomeFiltersetName\``))
		if (args.includes('list')) return msg.reply(client.translator.translate(`To list existing backups, run \`${util.prefix}restore list\``))
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

		fs.writeFileSync(path.join(__dirname, '../../../../backups', `${args[0]}.json`), JSON.stringify(backup, null, '\t'))
		msg.react(client.translator.translate('✅'))
	} catch (err) {
		client.log.error('Backup command unhappy:', err, err.source, err.error)
	}
}
