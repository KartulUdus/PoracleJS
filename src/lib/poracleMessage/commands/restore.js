const fs = require('fs')
const path = require('path')

exports.run = async (client, msg, args) => {
	try {
		const util = client.createUtil(msg, args)

		const {
			canContinue, target, isRegistered, userHasLocation, userHasArea,
		} = await util.buildTarget(args)

		if (!canContinue) return

		const backupFiles = fs.readdirSync(path.join(__dirname, '../../../../backups')).map((file) => file.split('.')[0])

		if (args.includes('list')) {
			return msg.reply(`${client.translator.translate('Available backups are')} \`\`\`\n${backupFiles.join(',\n')}\`\`\``)
		}
		if (!backupFiles.includes(args[0])) {
			return msg.reply(`${args[0]} ${client.translator.translate('is not an existing backup \n')}${client.translator.translate('Available backups are')} \`\`\`\n${backupFiles.join(',\n')}\`\`\``)
		}
		const backup = require(path.join(__dirname, '../../../../backups', `${args[0]}.json`))
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