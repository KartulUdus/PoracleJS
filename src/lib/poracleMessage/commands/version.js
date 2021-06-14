const { version } = require('../../../../package.json')

exports.run = async (client, msg, args, options) => {
	try {
		if (msg.isDM) {
			msg.reply(`PoracleJS version ${version}`)
		}

		if (!msg.isFromAdmin) {
			return
		}

		const util = client.createUtil(msg, options)

		const {
			canContinue, target,
		} = await util.buildTarget(args)

		if (!canContinue) return

		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		Promise.all([client.query.execPromise('git status'), client.query.execPromise('git --no-pager log -3')]).then(async (output) => {
			let changes = output[0]
			changes = changes.split('\n').filter((line) => line.match(/modified/gi) || line.match(/renamed/gi) || line.match(/On branch/gi))
			const gitLogs = output[1].split('\n')
			const commitLines = []
			const gitMsgs = []
			const fields = []
			gitLogs.forEach((logLine, index) => {
				if (logLine.match(/commit/gi)) commitLines.push(index)
			})
			commitLines.push(gitLogs.length)
			commitLines.forEach((n, index) => {
				if (commitLines[index + 1]) {
					gitMsgs.push(gitLogs.slice(n, commitLines[index + 1]))
				}
			})
			gitMsgs.forEach((gitMsg) => {
				let message = `[${gitMsg[0].slice(7).substring(0, 6)}] - ${gitMsg.slice(3).filter((line) => line !== '').join('\n')}`
				if (message.length > 1024) message = message.substring(0, 1023)
				fields.push({
					name: `${gitMsg[1].split(' ')[1]} - ${new Date(gitMsg[2].slice(8)).toLocaleDateString()}`,
					value: message,
				})
			})
			await msg.reply(
				changes ? `**Git status** \n${changes.join('\n')} \n\n **Recent updates**` : '**Recent updates**',
			)
			for (const field of fields) {
				await msg.reply(`${field.name}\n${field.value}\n`)
			}
		})
	} catch (err) {
		client.log.error('version command unhappy:', err)
	}
}
