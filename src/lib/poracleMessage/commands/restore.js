const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, args, options) => {
	try {
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const backupFiles = fs.readdirSync(path.join(__dirname, '../../../../backups')).filter((e) => path.extname(e).toLowerCase() === '.json').map((file) => file.split('.')[0])

		if (args.includes('list')) {
			return msg.reply(`${client.translator.translate('Available backups are')} \`\`\`\n${backupFiles.join(',\n')}\`\`\``)
		}
		if (!backupFiles.includes(args[0])) {
			return msg.reply(`${args[0]} ${client.translator.translate('is not an existing backup \n')}${client.translator.translate('Available backups are')} \`\`\`\n${backupFiles.join(',\n')}\`\`\``)
		}
		const backup = require(path.join(__dirname, '../../../../backups', `${args[0]}.json`))
		for (const key in backup) {
			if (Object.prototype.hasOwnProperty.call(backup, key)) {
				backup[key].map((track) => { track.id = target.id; track.profile_no = currentProfileNo })
				if (backup[key].length) {
					await client.query.deleteQuery(key, { id: target.id, profile_no: currentProfileNo })
					await client.query.insertOrUpdateQuery(key, backup[key])
				}
			}
		}
		return msg.react(client.translator.translate('✅'))
	} catch (err) {
		client.log.error('restore command unhappy:', err, err.source, err.error)
	}
}