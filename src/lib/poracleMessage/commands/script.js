const path = require('path')
const fs = require('fs')
const helpCommand = require('./help')

exports.run = async (client, msg, args, options) => {
	try {
		// Check target
		const util = client.createUtil(msg, options)

		const {
			canContinue, target, language, currentProfileNo,
		} = await util.buildTarget(args)

		if (!canContinue) return
		const commandName = __filename.slice(__dirname.length + 1, -3)
		client.log.info(`${target.name}/${target.type}-${target.id}: ${commandName} ${args}`)

		if (args[0] === 'help') {
			return helpCommand.run(client, msg, [commandName], options)
		}

		const translator = client.translatorFactory.Translator(language)

		if (!await util.commandAllowed(commandName)) {
			await msg.react('🚫')
			return msg.reply(translator.translate('You do not have permission to execute this command'))
		}

		const monsters = await client.query.selectAllQuery('monsters', { id: target.id, profile_no: currentProfileNo })
		const raids = await client.query.selectAllQuery('raid', { id: target.id, profile_no: currentProfileNo })
		const eggs = await client.query.selectAllQuery('egg', { id: target.id, profile_no: currentProfileNo })
		const human = (await client.query.selectAllQuery('humans', { id: target.id }))[0]
		const quests = await client.query.selectAllQuery('quest', { id: target.id, profile_no: currentProfileNo })
		const invasions = await client.query.selectAllQuery('invasion', { id: target.id, profile_no: currentProfileNo })
		const lures = await client.query.selectAllQuery('lures', { id: target.id, profile_no: currentProfileNo })
		const nests = await client.query.selectAllQuery('nests', { id: target.id, profile_no: currentProfileNo })
		const gyms = await client.query.selectAllQuery('gym', { id: target.id, profile_no: currentProfileNo })
		const profile = await client.query.selectOneQuery('profiles', { id: target.id, profile_no: currentProfileNo })

		let message = ''
		// allow user to override prefix
		const { prefix } = util

		if (human.latitude) message += `${prefix}location ${human.latitude},${human.longitude}\n`
		const areas = JSON.parse(human.area)
		if (areas.length) message += `${prefix}area add ${areas.map((x) => x.replace(/ /g, '_')).join(' ')}\n`
		const monsterParameters = {
			min: ['min_iv', -1],
			maxiv: ['max_iv', 100],
			mincp: ['min_cp', 0],
			macxp: ['max_cp', 9000],
			level: ['min_level', 0],
			maxlevel: ['max_level', 40],
			atk: ['atk', 0],
			def: ['def', 0],
			sta: ['sta', 0],
			maxatk: ['max_atk', 0],
			maxsta: ['max_sta', 0],
			maxdef: ['max_def', 0],
			weight: ['min_weight', 0],
			maxweight: ['max_weight', 9000000],
			rarity: ['rarity', -1],
			maxrarity: ['max_rarity', 6],
			t: ['min_time', 0],
			template: ['template', client.config.general.defaultTemplateName.toString()],
			d: ['distance', 0],
		}
		for (const monster of monsters) {
			//			const mon = client.GameData.monsters.find()
			message += `${prefix}track ${monster.pokemon_id ? monster.pokemon_id : 'everything'}`
			if (monster.form) message += ` form:${monster.form}` // will not work

			for (const [param, [dbFieldName, defaultValue]] of Object.entries(monsterParameters)) {
				if (monster[dbFieldName] !== defaultValue) message += ` ${param}:${monster[dbFieldName]}`
			}

			if (monster.clean) message += ' clean'
			// gender
			// league

			message += '\n'
		}

		msg.reply(message)

		if (args.contain('link')) {
			try {
				const hastelink = await client.hastebin(message)
				return await msg.reply(`Your backup is at ${hastelink}`)
			} catch (e) {
				await msg.reply('Hastebin seems down')
			}
		}

		const filepath = path.join(__dirname, `./${target.name}.txt`)
		fs.writeFileSync(filepath, message)
		await msg.replyWithAttachment('Your backup', filepath)
		fs.unlinkSync(filepath)
	} catch (err) {
		client.log.error(`profile command ${msg.content} unhappy:`, err)
	}
}
