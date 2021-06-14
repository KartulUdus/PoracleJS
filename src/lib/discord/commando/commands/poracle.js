const communityLogic = require('../../../communityLogic')

exports.run = async (client, msg) => {
	try {
		let communityToAdd

		if (client.config.areaSecurity.enabled) {
			for (const community of Object.keys(client.config.areaSecurity.communities)) {
				if (client.config.areaSecurity.communities[community].discord.channels.includes(msg.channel.id)) {
					communityToAdd = community
					break
				}
			}
			if (!communityToAdd) {
				return client.logs.log.info(`${msg.author.tag} tried to register in ${msg.channel.name}`)
			}
		} else if (!client.config.discord.channels.includes(msg.channel.id)) {
			return client.logs.log.info(`${msg.author.tag} tried to register in ${msg.channel.name}`)
		}

		const command = msg.content.split(' ')[0].substring(1)

		let language = ''

		if (client.config.general.availableLanguages) {
			for (const [key, availableLanguage] of Object.entries(client.config.general.availableLanguages)) {
				if (availableLanguage.poracle === command) {
					language = key
					break
				}
			}
		}

		const user = await client.query.selectOneQuery('humans', { id: msg.author.id })

		if (user) {
			if (user.admin_disable && !user.disabled_date) {
				return await msg.react('🙅') // account was disabled by admin, don't let him re-enable
			}

			const update = {}
			let updateRequired = false

			if (!user.enabled) {
				update.enabled = 1
				updateRequired = true
			}

			if (client.config.general.roleCheckMode === 'disable-user') {
				if (user.admin_disable && user.disabled_date) {
					update.admin_disable = 0
					update.disabled_date = null

					updateRequired = true
					client.logs.discord.log({
						level: 'debug',
						message: `user ${msg.author.tag} used poracle command to remove admin_disable flag`,
						event: 'discord:registerCheck',
					})
				}
			}

			if (communityToAdd) {
				update.community_membership = JSON.stringify(communityLogic.addCommunity(client.config, user.community_membership ? JSON.parse(user.community_membership) : [], communityToAdd))
				update.area_restriction = JSON.stringify(communityLogic.calculateLocationRestrictions(client.config,
					JSON.parse(update.community_membership)))
				updateRequired = true
			}

			if (updateRequired) {
				await client.query.updateQuery('humans', update, { id: msg.author.id })
				await msg.react('✅')
			} else {
				await msg.react('👌')
			}

			//			await client.query.updateQuery('humans', { language: language }, { id: msg.author.id })
		} else {
			await client.query.insertQuery('humans', {
				id: msg.author.id,
				type: 'discord:user',
				name: client.emojiStrip(msg.author.username),
				area: '[]',
				language,
				community_membership: communityToAdd ? JSON.stringify([communityToAdd.toLowerCase()]) : '[]',
				area_restriction: communityToAdd ? JSON.stringify(communityLogic.calculateLocationRestrictions(client.config, [communityToAdd])) : null,
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
