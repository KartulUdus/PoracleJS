// Discord Automated Program Telling Channels and Humans Apart

const { Client } = require('discord.js')

const sleep = (n) => new Promise((resolve) => setTimeout(resolve, n))

module.exports = async (idArray, config, log) => {
	const client = new Client()
	const result = { humans: [], channels: [] }
	let ready = false
	client.on('ready', () => {
		log.info('im ready')
		idArray.map((id) => {
			const human = client.users.get(id)
			const channel = client.channels.get(id)
			if (human) result.humans.push(id)
			if (channel) result.channels.push(id)
		})
		ready = true
	})
	client.on('error', (err) => {
		log.error(`Discord bot ${config.discord.token[0].substring(1, 6)}... errored:`, err)
		process.exit(1)
	})

	client.login(config.discord.token[0])

	while (!ready) await sleep(1000)
	return result
}