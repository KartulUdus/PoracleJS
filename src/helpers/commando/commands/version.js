const _ = require('lodash')
const path = require('path')

const { version } = require(`${path.join(__dirname, '/../../../../')}package.json`)

exports.run = (client, msg) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		return msg.author.send('Please run commands in Direct Messages').catch((O_o) => {
			client.log.error(O_o.message)
		})
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }

	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
				return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && msg.channel.type === 'dm') {
				return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}poracle to #${client.config.discord.channel}`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (isregistered) {

				Promise.all([client.query.execPromise('git status'), client.query.execPromise('git --no-pager log -3')]).then((output) => {
					let changes = output[0]
					changes = _.filter(changes.split('\n'), line => line.match(/modified/gi) || line.match(/renamed/gi) || line.match(/On branch/gi))
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
						fields.push({
							name: `${gitMsg[1].split(' ')[1]} - ${new Date(gitMsg[2].slice(8)).toLocaleDateString()}`,
							value: `[${gitMsg[0].slice(7).substring(0, 6)}](https://github.com/KartulUdus/PoracleJS/commit/${gitMsg[0].slice(7)}) - ${gitMsg.slice(3).filter(line => line !== '').join('\n')}`,
						})
					})
					msg.reply(
						`${client.user.username} is running on V${version}`,
						{
							embed: {
								thumbnail: {
									url: client.user.avatarURL,
								},
								description: changes ? `**Git status** \n${changes.join('\n')} \n\n **Recent updates**` : '**Recent updates**',
								fields,
							},
						},
					).catch((O_o) => {
						client.log.error(O_o.message)
					})
				}).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
		})
		.catch((err) => {
			client.log.error(`commando !version errored with: ${err.message} (command was "${msg.content}")`)
		})
}