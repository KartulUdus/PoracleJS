exports.run = async (client, msg) => {
	if (!client.config.discord.channels.includes(msg.channel.id)) {
		return client.logs.log.info(`${msg.author.tag} tried to register in ${msg.channel.name}`)
	}
	try {
		const command = msg.content.split(' ')[0].substring(1)

		let language = ''

		if (client.config.general.availableLanguages) {
			for (const [key, availableLanguage] of Object.entries(client.config.general.availableLanguages)) {
				if (availableLanguage.poracle == command) {
					language = key
					break
				}
			}
		}

		const isRegistered = await client.query.countQuery('humans', { id: msg.author.id })
		if (isRegistered) {
            if (client.config.general.roleCheckDeletionsMode == 2) {
                const user = await client.query.selectOneQuery('humans', { id: msg.author.id })
                if (user.admin_disable && !user.disabled_date) {
                    await client.query.updateQuery('humans', { admin_disable: 0 }, { id: msg.author.id })
                    client.logs.discord.log({ level: 'debug', message: `user ${member.tag} used poracle command to remove admin_disable flag`, event: 'discord:registerCheck' })
                } else if (user.admin_disable && user.disabled_date) {
                    await msg.react('🙅')  // account was disabled by admin, don't let him re-enable
                }
            }

			await msg.react('👌')
			//			await client.query.updateQuery('humans', { language: language }, { id: msg.author.id })
		} else {
			await client.query.insertQuery('humans', {
				id: msg.author.id, type: 'discord:user', name: client.emojiStrip(msg.author.username), area: '[]', language,
			})
			await msg.react('✅')
		}

		client.logs.log.info(`${client.emojiStrip(msg.author.username)} Registered!`)

		let greetingDts = client.dts.find((template) => template.type === 'greeting' && template.platform === 'discord' && template.language == language)
		if (!greetingDts) {
			greetingDts = client.dts.find((template) => template.type === 'greeting' && template.platform === 'discord' && template.default)
		}

		if (greetingDts) {
			const view = { prefix: client.config.discord.prefix }
			const greeting = client.mustache.compile(JSON.stringify(greetingDts.template))
			await msg.author.send(JSON.parse(greeting(view)))
		}
	} catch (err) {
		client.logs.log.error('!poracle command errored with:', err)
	}
}
