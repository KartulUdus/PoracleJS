const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		if (!msg.isFromAdmin) {
			client.log.info(`${msg.userId} ran "backup" command`)
			return await msg.react('🙅')
		}

		const util = client.createUtil(msg, options)

		const {
			canContinue, target, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

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
			monsters: await client.query.selectAllQuery('monsters', { id: target.id, profile_no: currentProfileNo }),
			raid: await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo }),
			egg: await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo }),
			quest: await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo }),
			invasion: await client.query.selectAllQuery('invasion', { id: target.id, profile_no: currentProfileNo }),
			weather: await client.query.selectAllQuery('weather', { id: target.id, profile_no: currentProfileNo }),
			lures: await client.query.selectAllQuery('lures', { id: target.id, profile_no: currentProfileNo }),
			gym: await client.query.selectAllQuery('gym', { id: target.id, profile_no: currentProfileNo }),
			forts: await client.query.selectAllQuery('forts', { id: target.id, profile_no: currentProfileNo }),
			nests: await client.query.selectAllQuery('nests', { id: target.id, profile_no: currentProfileNo }),
		}
		backup.monsters.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.raid.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.egg.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.quest.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.invasion.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.weather.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.lures.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.gym.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.forts.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })
		backup.nests.map((x) => { x.id = 0; delete x.uid; x.profile_no = 0 })

		fs.writeFileSync(path.join(__dirname, '../../../../backups', `${args[0]}.json`), JSON.stringify(backup, null, '\t'))
		msg.react(client.translator.translate('✅'))
	} catch (err) {
		client.log.error('Backup command unhappy:', err, err.source, err.error)
	}
}
