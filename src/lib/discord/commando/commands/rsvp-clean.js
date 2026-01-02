exports.run = async (client, msg) => {
	try {
		// Check target
		if (!client.config.discord.admins.includes(msg.author.id) && msg.channel.type !== 'DM') {
			return await msg.author.send(client.translator.translate('Please run commands in Direct Messages'))
		}

		const startMessage = await msg.reply('Clearing raid message cache - this will force all future RSVP updates to send new messages instead of editing existing ones...')

		// Clear raid message caches for all discord workers
		let clearedCount = 0
		for (const worker of client.discordWorkers) {
			const keys = worker.raidMessageCache.keys()
			clearedCount += keys.length
			worker.raidMessageCache.flushAll()
			await worker.saveRaidCache()
		}

		// Clear raid message cache for webhook worker
		if (client.discordWebhookWorker) {
			const keys = client.discordWebhookWorker.raidMessageCache.keys()
			clearedCount += keys.length
			client.discordWebhookWorker.raidMessageCache.flushAll()
			await client.discordWebhookWorker.saveRaidCache()
		}

		await startMessage.delete()
		const finishMessage = await msg.reply(`Raid message cache cleared! Removed ${clearedCount} cached raid messages. All future RSVP updates will send new messages.`)
		setTimeout(() => { finishMessage.delete() }, 15000)
	} catch (err) {
		await msg.reply('Failed to run rsvp-clean, check logs')
		client.logs.log.error(`rsvp-clean command "${msg.content}" unhappy:`, err)
	}
}

exports.conf = {
	enabled: true,
	guildOnly: false,
	aliases: [],
	permLevel: 1,
}

exports.help = {
	name: 'rsvp-clean',
	description: 'Clear raid message cache (admin only)',
	usage: 'rsvp-clean',
	example: '!rsvp-clean',
}
