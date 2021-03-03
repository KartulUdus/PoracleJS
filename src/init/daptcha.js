// Discord Automated Program Telling Channels and Humans Apart

const { Client } = require('discord.js')

const sleep = (n) => new Promise((resolve) => setTimeout(resolve, n))

module.exports = async (idArray, config, log) => {
	const client = new Client()
	const result = { humans: [], channels: [] }
	let ready = false
	client.on('ready', async () => {
		log.info('im ready')
		for (const id of idArray) {
			let human = null
			let channel = null
			// eslint-disable-next-line no-console
			console.log(`testing ${id}`)
			try {
				human = await client.users.fetch(id)
				// eslint-disable-next-line no-console
				if (human) console.log(`${id} is a human`)
				// eslint-disable-next-line no-empty
			} catch {}
			try {
				channel = await client.channels.fetch(id)
				// eslint-disable-next-line no-console
				if (channel) console.log(`${id} is a channel`)
				// eslint-disable-next-line no-empty
			} catch {}
			if (human) result.humans.push(id)
			if (channel) result.channels.push(id)
		}
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