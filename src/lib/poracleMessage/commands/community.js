const communityLogic = require('../../communityLogic')

exports.run = async (client, msg, args, options) => {
	try {
		if (!msg.isFromAdmin) {
			return await msg.react('🙅')
		}

		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language,
		} = await util.buildTarget(args)

		if (!canContinue) return
		client.log.info(`${target.name}/${target.type}-${target.id}: ${__filename.slice(__dirname.length + 1, -3)} ${args}`)

		const translator = client.translatorFactory.Translator(language)

		let invalidCommand = true

		if ((args[0] == 'add' || args[0] == 'remove' || args[0] == 'clear') && args.length < 2) invalidCommand = false
		if (args[0] == 'list' && args.length !== 1) invalidCommand = false

		if (!invalidCommand) {
			await msg.reply(translator.translateFormat('Valid commands are `{0}community add <name> <users>`, `{0}community remove <name> <users>`, `{0}community list`', util.prefix),
				{ style: 'markdown' })
			// await helpCommand.provideSingleLineHelp(client, msg, util, language, target, commandName)
			return
		}

		const command = args.shift()

		const communityKeys = Object.keys(client.config.areaSecurity.communities)

		if (command == 'list') {
			const originalWithUnderscore = communityKeys.map((area) => area.replace(/ /gi, '_')).sort()

			await msg.reply(translator.translate('These are the valid communities:'))
			await msg.reply(`\`\`\`\n${originalWithUnderscore.join('\n')}\`\`\``)
			return
		}

		let community
		if (command == 'add' || command == 'remove') {
			community = args.shift().toLowerCase()
		}

		// Make list of ids
		const mentions = msg.getMentions()
		const targets = mentions.map((x) => x.id)
		targets.push(...(args.filter((x) => parseInt(x, 10))))

		switch (command) {
			case 'clear': {
				for (const id of targets) {
					client.log.info(`Disable ${id}`)

					await client.query.updateQuery('humans', {
						area_restriction: null,
						community_membership: '[]',
					}, { id })
				}
				break
			}
			case 'add':
				for (const id of targets) {
					const human = await client.query.selectOneQuery('humans', { id })
					if (human) {
						const existingCommunities = JSON.parse(human.community_membership)
						const newCommunities = communityLogic.addCommunity(client.config, existingCommunities, community)

						await client.query.updateQuery('humans', {
							area_restriction: JSON.stringify(communityLogic.calculateLocationRestrictions(client.config, newCommunities)),
							community_membership: JSON.stringify(newCommunities),
						}, { id })
					}

					break
				}
				break
			case 'remove':
				for (const id of targets) {
					const human = await client.query.selectOneQuery('humans', { id })
					if (human) {
						const existingCommunities = JSON.parse(human.community_membership)
						const newCommunities = communityLogic.removeCommunity(client.config, existingCommunities, community)

						await client.query.updateQuery('humans', {
							area_restriction: JSON.stringify(communityLogic.calculateLocationRestrictions(client.config, newCommunities)),
							community_membership: JSON.stringify(newCommunities),
						}, { id })
					}

					break
				}

				break
			default:
				break
		}
		await msg.react('✅')
	} catch (err) {
		client.log.error(`disable command ${msg.content} unhappy:`, err)
	}
}
