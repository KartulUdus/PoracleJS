const _ = require('lodash')
const config = require('config')

let monsterDataPath = `${__dirname}/../../../util/monsters.json`
if (_.includes(['de', 'fr', 'ja', 'ko', 'ru'], config.locale.language.toLowerCase())) {
	monsterDataPath = `${__dirname}/../../../util/locale/monsters${config.locale.language.toLowerCase()}.json`
}
const monsterData = require(monsterDataPath)
const typeData = require(`${__dirname}/../../../util/types`)
const formData = require(`${__dirname}/../../../util/forms`)

exports.run = (client, msg, args) => {
	let target = { id: msg.author.id, name: msg.author.tag }
	if (!_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
		return msg.author.send('Please run commands in Direct Messages').catch((O_o) => {
			client.log.error(O_o.message)
		})
	}
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') target = { id: msg.channel.id, name: msg.channel.name }
	if (_.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) target = { id: msg.content.match(client.hookRegex), name: `Webhook-${_.random(99999)}` }

	client.query.countQuery('id', 'humans', 'id', target.id)
		.then((isregistered) => {
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.content.match(client.hookRegex)) {
				return msg.reply(`${target.name} does not seem to be registered. add it with ${client.config.discord.prefix}webhook add <YourWebhook>`).catch((O_o) => {
					client.log.error(O_o.message)
				})
			}
			if (!isregistered && _.includes(client.config.discord.admins, msg.author.id) && msg.channel.type === 'text') {
				return msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${client.config.discord.prefix}channel add`).catch((O_o) => {})
			}
			if (!isregistered && msg.channel.type === 'dm') {
				return msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${client.config.discord.prefix}poracle to #${client.config.discord.channel}`).catch((O_o) => {})
			}
			if (isregistered) {

				let monsters = []
				let distance = 0
				let cp = 0
				let maxcp = 9000
				let iv = -1
				let maxiv = 100
				let level = 0
				let maxlevel = 40
				let atk = 0
				let def = 0
				let sta = 0
				let maxAtk = 15
				let maxDef = 15
				let maxSta = 15
				let gender = 0
				let weight = 0
				let maxweight = 9000000
				let template = 3
				const forms = []

				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid) monsters.push(pid)
				})
				args.forEach((element) => {

					if (element.match(/maxlevel\d/gi)) 	maxlevel = element.replace(/maxlevel/gi, '')
					else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
					else if (element.match(/maxcp\d/gi)) maxcp = element.replace(/maxcp/gi, '')
					else if (element.match(/maxiv\d/gi)) maxiv = element.replace(/maxiv/gi, '')
					else if (element.match(/maxweight\d/gi)) maxweight = element.replace(/maxweight/gi, '')
					else if (element.match(/maxatk\d/gi)) maxAtk = element.replace(/maxatk/gi, '')
					else if (element.match(/maxdef\d/gi)) maxDef = element.replace(/maxdef/gi, '')
					else if (element.match(/maxsta\d/gi)) maxSta = element.replace(/maxsta/gi, '')
					else if (element.match(/cp\d/gi)) cp = element.replace(/cp/gi, '')
					else if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
					else if (element.match(/iv\d/gi)) iv = element.replace(/iv/gi, '')
					else if (element.match(/atk\d/gi)) atk = element.replace(/atk/gi, '')
					else if (element.match(/def\d/gi)) def = element.replace(/def/gi, '')
					else if (element.match(/sta\d/gi)) sta = element.replace(/sta/gi, '')
					else if (element.match(/female/gi)) gender = 2
					else if (element.match(/male/gi)) gender = 1
					else if (element.match(/genderless/gi)) gender = 3
					else if (element.match(/weight\d/gi)) 	weight = element.replace(/weight/gi, '')
					else if (element.match(/form\w/gi)) forms.push(element.replace(/form/gi, ''))
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							} return k
						})
					}
					else if (element.match(/everything/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1) // eslint-disable-line no-return-assign
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}

				})
				if (monsters.length && !forms.length) {
					const form = 0
					const insertData = monsters.map(pokemonId => [target.id, pokemonId, template, distance, iv, maxiv, cp, maxcp, level, maxlevel, atk, def, sta, weight, maxweight, form, maxAtk, maxDef, maxSta, gender])
					client.query.insertOrUpdateQuery(
						'monsters',
						['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form', 'maxAtk', 'maxDef', 'maxSta', 'gender'],
						insertData,
					).catch((O_o) => {})

					msg.react('✅').catch((O_o) => {
						client.log.error(O_o.message)
					})
					client.log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters} in ${target.name}`, event: 'discord:track' })

				}
				else if (monsters.length > 1 && forms.length) {
					return msg.reply('Form filters can be added to 1 monster at a time').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
				else if (!monsters.length) {
					return msg.reply('404 NO MONSTERS FOUND').catch((O_o) => {
						client.log.error(O_o.message)
					})
				}
				else if (monsters.length === 1 && forms.length) {
					if (!_.has(formData, monsters[0])) {
						return msg.reply(`Sorry, ${monsters[0]} doesn't have forms`).catch((O_o) => {
							client.log.error(O_o.message)
						})
					}

					const fids = []
					forms.forEach((form) => {
						const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form)
						if (fid) fids.push(fid)
					})
					const insertData = fids.map(form => [target.id, monsters[0], template, distance, iv, maxiv, cp, maxcp, level, maxlevel, atk, def, sta, weight, maxweight, form, maxAtk, maxDef, maxSta, gender])
					client.log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters[0]} form: ${fids} in ${target.name}`, event: 'discord:track' })
					client.query.insertOrUpdateQuery(
						'monsters',
						['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form', 'maxAtk', 'maxDef', 'maxSta', 'gender'],
						insertData,
					).catch((O_o) => {})
					if (fids.length > 0) {
						msg.react('✅').catch((O_o) => {
							client.log.error(O_o.message)
						})
					}
					else {
						msg.reply(`Sorry, I didn't find those forms for ${monsterData[monsters[0]].name}`).catch((O_o) => {
							client.log.error(O_o.message)
						})
					}
				}
			}
		})
		.catch((err) => {
			client.log.error(`commando !track errored with: ${err.message} (command was "${msg.content}")`)
		})
}