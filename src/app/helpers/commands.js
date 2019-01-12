const { Client } = require('discord.js')
const _ = require('lodash')
var emojiStrip = require('emoji-strip')


const client = new Client()
const config = require('config')
const migrator = require('../helpers/migrator')
const log = require('../logger')
const mysql = require('promise-mysql2')
const emojiStrip = require('emoji-strip')

const db = mysql.createPool(config.db)
const Controller = require('../controllers/controller')

const query = new Controller(db)
const geofence = require(config.geocoding.geofence)
const dts = require('../../../config/dts')
const questDts = require('../../../config/questdts')

const monsterData = require(config.locale.commandMonstersJson)
const teamData = require('../util/teams')
const typeData = require('../util/types')
const formData = require('../util/forms')
const hastebin = require('hastebin-gen')


client.on('ready', () => {
	log.info(`Commander "${client.user.tag}" awaiting for orders!`)
	client.user.setPresence({
		game: {
			name: 'PoracleJS',
		}
	})

})

client.on('message', (msg) => {

/*
 _   _ _   _       _____ _   _     ___   _____             _____ _   _ ___   ___
( ) ( ( ) ( /'\_/`(  _  ( ) ( )   (  _`\(  _  /'\_/`/'\_/`(  _  ( ) ( (  _`\(  _`\
| |_| | | | |     | (_) | `\| |   | ( (_| ( ) |     |     | (_) | `\| | | ) | (_(_)
|  _  | | | | (_) |  _  | , ` |   | |  _| | | | (_) | (_) |  _  | , ` | | | `\__ \
| | | | (_) | | | | | | | |`\ |   | (_( | (_) | | | | | | | | | | |`\ | |_) ( )_) |
(_) (_(_____(_) (_(_) (_(_) (_)   (____/(_____(_) (_(_) (_(_) (_(_) (_(____/`\____)

*/

	if (msg.content === `${config.discord.prefix}poracle` && msg.channel.name === config.discord.channel) {
		query.countQuery('id', 'humans', 'id', msg.author.id)
			.then((isregistered) => {
				if (isregistered) msg.react('👌')
				if (!isregistered) {
					query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [`'${msg.author.id}'`, `'${emojiStrip(msg.author.username)}'`, '\'[]\''])
					msg.react('✅')
					msg.author.send(dts.greeting)
					log.info(`${msg.author.username} registered`)

				}
			})
			.catch((err) => {
				log.error(`Commander !poracle errored with: ${err}`)
			})
	}

	else if (msg.content === `${config.discord.prefix}unregister`) {
		query.countQuery('id', 'humans', 'id', msg.author.id)
			.then((isregistered) => {
				if (!isregistered) msg.react('👌')
				if (isregistered) {
					query.deleteQuery('egg', 'id', msg.author.id)
					query.deleteQuery('monsters', 'id', msg.author.id)
					query.deleteQuery('raid', 'id', msg.author.id)
					query.deleteQuery('quest', 'id', msg.author.id)
					query.deleteQuery('humans', 'id', msg.author.id)
					msg.react('✅')
					log.info(`${msg.author.username} unregistered`)

				}
			})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}unregister `) && _.includes(config.discord.admins, msg.author.id)) {
		const target = msg.mentions.users.first()
		if (target !== undefined) {
			query.countQuery('id', 'humans', 'id', target.id).then((isregistered) => {
				if (!isregistered) msg.react('👌')
				if (isregistered) {
					query.deleteQuery('egg', 'id', target.id)
					query.deleteQuery('monsters', 'id', target.id)
					query.deleteQuery('raid', 'id', target.id)
					query.deleteQuery('humans', 'id', target.id)
					msg.react('✅')
					log.info(`${msg.author.username} unregistered`)

				}
			})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}location `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const search = msg.content.split('location ').pop()
			query.geolocate(search).then((location) => {
				query.updateLocation('humans', location[0].latitude, location[0].longitude, 'id', msg.author.id)
				const maplink = `https://www.google.com/maps/search/?api=1&query=${location[0].latitude},${location[0].longitude}`
				msg.author.send(`:wave:, I set your location to : \n${maplink}`)
				msg.react('✅')
			})
		})
	}

	else if (msg.content === `${config.discord.prefix}start`) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			query.updateQuery('humans', 'enabled', true, 'id', msg.author.id)
			msg.react('✅')
			log.debug(`${msg.author.username} enabled alarms`)
		})
	}

	else if (msg.content === `${config.discord.prefix}stop`) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			query.updateQuery('humans', 'enabled', false, 'id', msg.author.id)
			msg.react('✅')
			log.debug(`${msg.author.username} disabled alarms`)
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}area add `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}area add`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const confAreas = geofence.map(area => area.name.toLowerCase())
			query.selectOneQuery('humans', 'id', msg.author.id).then((human) => {
				const oldArea = JSON.parse(human.area.split())
				const validAreas = confAreas.filter(x => args.includes(x))
				const addAreas = validAreas.filter(x => !oldArea.includes(x))
				let newAreas = oldArea.concat(addAreas)
				newAreas = newAreas.filter(n => n)
				if (addAreas.length) query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.author.id)
				if (!validAreas.length) {
					msg.reply(`no valid areas there, please use one of ${confAreas}`)
					return null
				}
				if (addAreas.length) {
					msg.reply(`Added areas: ${addAreas}`)
					log.info(`${msg.author.username} added areas ${addAreas}`)
				}
				else msg.react('👌')

			})
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}area remove `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}area remove`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const confAreas = geofence.map(area => area.name.toLowerCase())
			query.selectOneQuery('humans', 'id', msg.author.id).then((human) => {
				const oldArea = JSON.parse(human.area.split())
				const validAreas = oldArea.filter(x => args.includes(x))
				const removeAreas = validAreas.filter(x => oldArea.includes(x))
				const newAreas = oldArea.filter(x => !removeAreas.includes(x))
				if (removeAreas.length) {
					query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.author.id)
				}
				if (!validAreas.length) {
					msg.reply(`404 NO VALID AND TRACKED AREAS FOUND \n VALID: ${confAreas} \n TRACKED: ${oldArea}`)
					return null
				}
				if (removeAreas.length) {
					msg.reply(`Removed areas: ${removeAreas}`)
					log.info(`${msg.author.username} removed areas ${removeAreas}`)
				}
				else msg.react('👌')
			})

		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}track `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}

			const rawArgs = msg.content.slice(`${config.discord.prefix}track`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
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
			let weight = 0
			let maxweight = 9000000
			let template = 3
			const forms = []

			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
			})
			args.forEach((element) => {

				if (element.match(/maxlevel\d/gi)) 	maxlevel = element.replace(/maxlevel/gi, '')
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/maxcp\d/gi)) maxcp = element.replace(/maxcp/gi, '')
				else if (element.match(/maxiv\d/gi)) maxiv = element.replace(/maxiv/gi, '')
				else if (element.match(/maxweight\d/gi)) maxweight = element.replace(/maxweight/gi, '')
				else if (element.match(/cp\d/gi)) cp = element.replace(/cp/gi, '')
				else if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
				else if (element.match(/iv\d/gi)) iv = element.replace(/iv/gi, '')
				else if (element.match(/atk\d/gi)) atk = element.replace(/atk/gi, '')
				else if (element.match(/def\d/gi)) def = element.replace(/def/gi, '')
				else if (element.match(/sta\d/gi)) sta = element.replace(/sta/gi, '')
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
				else if (element.match(/everything/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}

			})
			if (monsters.length && !forms.length) {
				const form = 0
				monsters.forEach((monster) => {
					query.insertOrUpdateQuery(
						'monsters',
						['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
						[`'${msg.author.id}'`, `'${monster}'`, `'${template}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
					).then(log.info(`${msg.author.username} started tracking ${monsterData[monster].name}`))
				})
				msg.react('✅')
				log.info(`${msg.author.username} started tracking ${monsters}`)

			}
			else if (monsters.length > 1 && forms.length) {
				msg.reply('Form filters can be added to 1 monster at a time')
			}
			else if (!monsters.length) {
				msg.reply('404 NO MONSTERS FOUND')
			}
			else if (monsters.length === 1 && !forms.length) {
				if (!_.has(formData, monsters[0])) {
					msg.reply(`Sorry, ${monsters[0]} doesn't have forms`)
					return null
				}

				const fids = []
				forms.forEach((form) => {
					const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form)
					if (fid !== undefined) fids.push(fid)
				})
				fids.forEach((form) => {
					query.insertOrUpdateQuery(
						'monsters',
						['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
						[`'${msg.author.id}'`, `'${monsters[0]}'`, `'${template}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
					).then(log.info(`${msg.author.username} started tracking ${monsterData[monsters[0]].name} form ${formData[monsters[0]][form]} `))

				})
				if (fids.length > 0) {
					msg.react('✅')
				}
				else {
					msg.reply(`Sorry, I didn't find those forms for ${monsterData[monsters[0]].name}`)
				}
			}

		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}untrack `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}untrack`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			let monsters = []
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
				if (element.match(/everything/gi)) {
					monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
				}
			})

			if (monsters.length) {
				monsters.forEach((monster) => {
					query.deleteByIdQuery('monsters', 'pokemon_id', `${monster}`, msg.author.id)
						.then(log.info(`${msg.author.username} removed pokemon tracking ${monsterData[monster].name}`))
				})
				msg.react('✅')
			}
			else msg.reply('404 NO MONSTERS FOUND')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}raid `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}track`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const monsters = []
			let park = 0
			let distance = 0
			let team = 4
			let template = 3
			const levels = []

			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
			})
			args.forEach((element) => {
				if (element.match(/park/gi)) park = 1
				else if (element.match(/level\d/gi)) levels.push(element.replace(/level/gi, ''))
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/instinct/gi)) team = 3
				else if (element.match(/valor/gi)) team = 2
				else if (element.match(/mystic/gi)) team = 1
				else if (element.match(/harmony/gi)) team = 0
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}
			})

			if (monsters.length !== 0 && levels.length === 0) {
				const level = 0
				monsters.forEach((monster) => {
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						[`'${msg.author.id}'`, `'${monster}'`, `'${template}'`, `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
					).then(log.info`${msg.author.username} started tracking level ${level} ${monsterData[monster].name} raids`)
				})
				msg.react('✅')

			}
			else if (monsters.length === 0 && levels.length === 0) msg.reply('404 NO MONSTERS FOUND')
			else if (monsters.length !== 0 && levels.length !== 0) msg.reply('400 Can\'t track raids by name and level at the same time')
			else if (monsters.length === 0 && levels.length !== 0) {
				levels.forEach((level) => {
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'distance', 'park', 'team', 'level'],
						[`'${msg.author.id}'`, '\'721\'', `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
					).then(log.info`${msg.author.username} started tracking level ${level} raids`)
				})
				msg.react('✅')
			}
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}unraid `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}unraid`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const monsters = []
			const levels = []
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
				else if (element.match(/level\d/gi)) {
					levels.push(element.replace(/level/gi, ''))
				}

			})
			if (monsters.length) {
				monsters.forEach((monster) => {
					query.deleteByIdQuery('raid', 'pokemon_id', `${monster}`, msg.author.id)
						.then(log.info(`${msg.author.username} stopped tracking level ${monster} raids`))
				})
				msg.react('✅')
			}
			if (levels.length) {
				levels.forEach((level) => {
					query.deleteByIdQuery('raid', 'level', `${level}`, msg.author.id)
						.then(log.info(`${msg.author.username} stopped tracking level ${level} raids`))
				})
				msg.react('✅')
			}
			if (!monsters.length && !levels.length) msg.reply('404 No raid bosses or levels found')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}egg `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}

		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}egg`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			let park = 0
			let distance = 0
			let level = 0
			let team = 4
			let template = 3

			args.forEach((element) => {
				if (element.match(/park/gi)) park = 1
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
				else if (element.match(/instinct/gi)) team = 3
				else if (element.match(/valor/gi)) team = 2
				else if (element.match(/mystic/gi)) team = 1
				else if (element.match(/harmony/gi)) team = 0
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}

			})

			if (level) {
				query.insertOrUpdateQuery(
					'egg',
					['id', 'raid_level', 'template', 'distance', 'park', 'team'],
					[`'${msg.author.id}'`, `'${level}'`, `'${template}'`, `'${distance}'`, `'${park}'`, `'${team}'`]
				)
				msg.react('✅')
				log.info(`${msg.author.username} started tracking level${level} raid eggs`)
			}
			else msg.reply('404 NO LEVELS FOUND')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}unegg `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}unegg`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			let level = 0

			args.forEach((element) => {
				if (element.match(/level/gi)) {
					level = element.replace(/level/gi, '')
				}
			})
			if (level) {
				query.deleteByIdQuery('egg', 'raid_level', `${level}`, msg.author.id)
				msg.react('✅')
			}
			else msg.reply('404 NO MONSTERS FOUND')
		})
	}

	else if (msg.content === `${config.discord.prefix}tracked`) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			Promise.all([
				query.selectAllQuery('monsters', 'id', msg.author.id),
				query.selectAllQuery('raid', 'id', msg.author.id),
				query.selectAllQuery('egg', 'id', msg.author.id),
				query.selectOneQuery('humans', 'id', msg.author.id),
				query.selectAllQuery('quest', 'id', msg.author.id),
			]).then((data) => {
				const monsters = data[0]
				const raids = data[1]
				const eggs = data[2]
				const human = data[3]
				const quests = data[4]
				const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
				msg.reply(`👋\nYour location is currently set to ${maplink} \nand you currently are set to receive alarms in ${human.area}`)
				let message = ''
				if (monsters.length !== 0) {
					message = message.concat('\n\nYou\'re  tracking the following monsters:\n')
				}
				else message = message.concat('\n\nYou\'re not tracking any monsters')

				monsters.forEach((monster) => {
					const monsterName = monsterData[monster.pokemon_id].name
					let miniv = monster.min_iv
					if (miniv === -1) miniv = 0
					message = message.concat(`\n**${monsterName}** distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} minimum stats: ATK:${monster.atk} DEF:${monster.def} STA:${monster.sta}`)
				})
				if (raids.length || eggs.length) {
					message = message.concat('\n\nYou\'re tracking the following raids:\n')
				}
				else message = message.concat('\n\nYou\'re not tracking any raids')
				raids.forEach((raid) => {
					const monsterName = monsterData[raid.pokemon_id].name
					const raidTeam = teamData[raid.team].name
					if (parseInt(raid.pokemon_id, 10) === 721) {
						message = message.concat(`\n**level:${raid.level} raids** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`)
					}
					else {
						message = message.concat(`\n**${monsterName}** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`)
					}
				})
				eggs.forEach((egg) => {
					const raidTeam = teamData[egg.team].name
					message = message.concat(`\n**Level ${egg.raid_level} eggs** distance: ${egg.distance}m controlled by ${raidTeam} , must be in park: ${egg.park}`)
				})

				if (quests.length) {
					message = message.concat('\n\nYou\'re tracking the following quests:\n')
				}

				quests.forEach((quest) => {
					let rewardThing = ''
					if (quest.reward_type === 7) rewardThing = monsterData[quest.reward].name
					if (quest.reward_type === 3) rewardThing = `${quest.reward} or more stardust`
					if (quest.reward_type === 2) rewardThing = questDts.rewardItems[quest.reward]
					message = message.concat(`\nReward: ${rewardThing} distance: ${quest.distance}m `)
				})

				if (message.length < 6000) {
					msg.reply(message, { split: true })
				}
				else {
					const hastebinMessage = hastebin(message)
					hastebinMessage
						.then((hastelink) => {
							msg.reply(`${msg.author.username} tracking list is quite long. Have a look at ${hastelink}`)
						})
						.catch((err) => {
							msg.reply(`${msg.author.username} tracking list is long, but Hastebin is also down. ☹️ \nPlease try again later.`)
							log.error(`Hastebin unhappy: ${err}`)

						})
				}
			})
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}quest `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}


		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			let monsters = []
			const items = []
			let distance = 0
			const questTracks = []
			let template = 3
			const rawArgs = msg.content.slice(`${config.discord.prefix}quest`.length)
			const args = rawArgs.toLowerCase().split(' ')
			let minDust = 10000000
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}
				else if (element.match(/stardust\d/gi)) minDust = element.replace(/stardust/gi, '')
				else if (element === 'stardust') minDust = 1
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
			})
			_.forEach(questDts.rewardItems, (item, key) => {
				const re = new RegExp(` ${item}`, 'gi')
				if (rawArgs.match(re)) items.push(key)
			})
			if (rawArgs.match(/all pokemon/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
			if (rawArgs.match(/all items/gi)) {
				_.forEach(questDts.rewardItems, (item, key) => {
					items.push(key)
				})
			}
			if (rawArgs.match(/stardust\d/gi)) {
				questTracks.push({
					id: msg.author.id,
					reward: minDust,
					template: template,
					reward_type: 3,
					distance: distance
				})
			}
			monsters.forEach((pid) => {
				questTracks.push({
					id: msg.author.id,
					reward: pid,
					template: template,
					reward_type: 7,
					distance: distance
				})
			})
			items.forEach((i) => {
				questTracks.push({
					id: msg.author.id,
					reward: i,
					template: template,
					reward_type: 2,
					distance: distance
				})
			})
			questTracks.forEach((t) => {
				query.insertOrUpdateQuery(
					'quest',
					['id', 'reward', 'template', 'reward_type', 'distance'],
					[`'${t.id}'`, `'${t.reward}'`, `'${t.template}'`, `'${t.reward_type}'`, `'${t.distance}'`]
				).then((p) => {
					log.info(`${msg.author.username} Added quest tracking`)
				})
			})
			msg.react('✅')
		})
	}


	else if (msg.content.startsWith(`${config.discord.prefix}remove quest `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.author.id).then((isregistered) => {
			if (!isregistered) {
				msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
				return null
			}
			let monsters = [0]
			const items = [0]
			let stardustTracking = 9999999
			const rawArgs = msg.content.slice(`${config.discord.prefix}remove quest `.length)
			const args = rawArgs.toLowerCase().split(' ')
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
			})
			_.forEach(questDts.rewardItems, (item, key) => {
				const re = new RegExp(item, 'gi')
				if (rawArgs.match(re)) items.push(key)
			})
			if (rawArgs.match(/stardust/gi)) {
				stardustTracking = 0
			}
			if (rawArgs.match(/all pokemon/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
			if (rawArgs.match(/all items/gi)) {
				_.forEach(questDts.rewardItems, (item, key) => {
					items.push(key)
				})
			}

			const remQuery = `
			delete from quest WHERE id=${msg.author.id} and 
			((reward_type = 2 and reward in(${items})) or (reward_type = 7 and reward in(${monsters})) or (reward_type = 3 and reward > ${stardustTracking}))		
			`
			query.mysteryQuery(remQuery).then((t) => {
				log.info(`${msg.author.username} removed quest tracking`)
			})
			msg.react('✅')
		})
	}

	/*
	 ___   _   _ _____ _   _ _   _ ___   _         ___   _____             _____ _   _ ___   ___
	(  _`\( ) ( (  _  ( ) ( ( ) ( (  _`\( )       (  _`\(  _  /'\_/`/'\_/`(  _  ( ) ( (  _`\(  _`\
	| ( (_| |_| | (_) | `\| | `\| | (_(_| |       | ( (_| ( ) |     |     | (_) | `\| | | ) | (_(_)
	| |  _|  _  |  _  | , ` | , ` |  _)_| |  _    | |  _| | | | (_) | (_) |  _  | , ` | | | `\__ \
	| (_( | | | | | | | |`\ | |`\ | (_( | |_( )   | (_( | (_) | | | | | | | | | | |`\ | |_) ( )_) |
	(____/(_) (_(_) (_(_) (_(_) (_(____/(____/'   (____/(_____(_) (_(_) (_(_) (_(_) (_(____/`\____)

	*/

	else if (msg.content === `${config.discord.prefix}channel add`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (isregistered) {
				msg.react('👌')
				return null
			}
			query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [`'${msg.channel.id}'`, `'${emojiStrip(msg.channel.name)}'`, '\'[]\''])
			msg.react('✅')
			msg.reply(`${msg.channel.name} has been registered`)
			log.info(`${msg.author.username} registered ${msg.channel.name}`)
		})
	}

	else if (msg.content === `${config.discord.prefix}channel remove`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.react('👌')
				return null
			}
			query.deleteQuery('egg', 'id', msg.channel.id)
			query.deleteQuery('monsters', 'id', msg.channel.id)
			query.deleteQuery('raid', 'id', msg.channel.id)
			query.deleteQuery('humans', 'id', msg.channel.id)
			msg.react('✅')
			log.info(`${msg.author.username} unregistered ${msg.channel.name}`)
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel location `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const search = msg.content.split(`${config.discord.prefix}channel location `).pop()
			query.geolocate(search).then((location) => {
				query.updateLocation('humans', location[0].latitude, location[0].longitude, 'id', msg.channel.id)
				const maplink = `https://www.google.com/maps/search/?api=1&query=${location[0].latitude},${location[0].longitude}`
				msg.reply(`:wave:, I set ${msg.channel.name}'s location to : \n${maplink}`)
				msg.react('✅')
			})

		})
	}

	else if (msg.content === `${config.discord.prefix}channel start`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			query.updateQuery('humans', 'enabled', true, 'id', msg.channel.id)
			msg.react('✅')
			log.debug(`${msg.author.username} enabled alarms in ${msg.channel.name}`)
		})
	}

	else if (msg.content === `${config.discord.prefix}channel stop`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			query.updateQuery('humans', 'enabled', false, 'id', msg.channel.id)
			msg.react('✅')
			log.debug(`${msg.author.username} disabled alarms in ${msg.channel.name}`)
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel area add `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel area add`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const confAreas = geofence.map(area => area.name.toLowerCase())
			query.selectOneQuery('humans', 'id', msg.channel.id).then((channel) => {
				const oldArea = JSON.parse(channel.area.split())
				const validAreas = confAreas.filter(x => args.includes(x))
				const addAreas = validAreas.filter(x => !oldArea.includes(x))
				let newAreas = oldArea.concat(addAreas)
				newAreas = newAreas.filter(n => n)
				if (addAreas.length !== 0) {
					query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.channel.id)
				}
				if (validAreas.length) {
					if (addAreas.length) {
						msg.reply(`Added areas: ${addAreas}`)
						log.info(`${msg.author.username} added areas ${addAreas} to ${msg.channel.name}`)
					}
					else msg.react('👌')
				}
				else msg.reply(`no valid areas there, please use one of ${confAreas}`)
			})
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel area remove `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel area remove`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const confAreas = geofence.map(area => area.name.toLowerCase())
			query.selectOneQuery('humans', 'id', msg.channel.id).then((channel) => {
				const oldArea = JSON.parse(channel.area.split())
				const validAreas = oldArea.filter(x => args.includes(x))
				const removeAreas = validAreas.filter(x => oldArea.includes(x))
				const newAreas = oldArea.filter(x => !removeAreas.includes(x))
				if (removeAreas.length !== 0) {
					query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', msg.channel.id)
				}
				if (validAreas.length !== 0) {
					if (removeAreas.length !== 0) {
						msg.reply(`Removed areas: ${removeAreas}`)
						log.info(`${msg.author.username} removed areas ${removeAreas} from ${msg.channel.name}`)
					}
					else msg.react('👌')
				}
				else msg.reply(`404 NO VALID AND TRACKED AREAS FOUND \n VALID: ${confAreas} \n TRACKED: ${oldArea}`)
			})
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel track `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel track`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
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
			let weight = 0
			let template = 3
			let maxweight = 9000000
			const forms = []

			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
			})
			args.forEach((element) => {

				if (element.match(/maxlevel\d/gi)) 	maxlevel = element.replace(/maxlevel/gi, '')
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/maxcp\d/gi)) maxcp = element.replace(/maxcp/gi, '')
				else if (element.match(/maxiv\d/gi)) maxiv = element.replace(/maxiv/gi, '')
				else if (element.match(/maxweight\d/gi)) maxweight = element.replace(/maxweight/gi, '')
				else if (element.match(/cp\d/gi)) cp = element.replace(/cp/gi, '')
				else if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
				else if (element.match(/iv\d/gi)) iv = element.replace(/iv/gi, '')
				else if (element.match(/atk\d/gi)) atk = element.replace(/atk/gi, '')
				else if (element.match(/def\d/gi)) def = element.replace(/def/gi, '')
				else if (element.match(/sta\d/gi)) sta = element.replace(/sta/gi, '')
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
				else if (element.match(/everything/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}

			})
			if (monsters.length && !forms.length) {
				const form = 0
				monsters.forEach((monster) => {
					query.insertOrUpdateQuery(
						'monsters',
						['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
						[`'${msg.channel.id}'`, `'${monster}'`, `'${template}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
					).then(log.info(`${msg.author.username} started tracking ${monsterData[monster].name} in ${msg.channel.name} `))
				})
				msg.react('✅')
				log.info(`${msg.author.username} started tracking ${monsters} in ${msg.channel.name}`)

			}
			else if (monsters.length > 1 && forms.length !== 0) msg.reply('Form filters can be added to 1 monster at a time')
			else if (monsters.length === 0) msg.reply('404 NO MONSTERS FOUND')
			else if (monsters.length === 1 && forms.length !== 0) {
				if (_.has(formData, monsters[0])) {
					const fids = []
					forms.forEach((form) => {
						const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form)
						if (fid !== undefined) fids.push(fid)
					})
					fids.forEach((form) => {
						query.insertOrUpdateQuery(
							'monsters',
							['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
							[`'${msg.channel.id}'`, `'${monsters[0]}'`, `'${template}'`, `'${distance}'`, `'${iv}'`, `'${maxiv}'`, `'${cp}'`, `'${maxcp}'`, `'${level}'`, `'${maxlevel}'`, `'${atk}'`, `'${def}'`, `'${sta}'`, `'${weight}'`, `'${maxweight}'`, `'${form}'`]
						)
							.then(log.info(`${msg.author.username} started tracking ${monsterData[monsters[0]].name} form ${formData[monsters[0]][form]} in ${msg.channel.name}`))

					})
					if (fids.length > 0) {
						msg.react('✅')
						log.info(`${msg.author.username} started tracking ${monsters[0]}, forms ${fids} in ${msg.channel.name}`)
					}
					else {
						msg.reply(`Sorry, I didn't find those forms for ID ${monsters[0]}`)
					}
				}
				else {
					msg.reply(`Sorry, ${monsters[0]} doesn't have forms`)
				}
			}
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel untrack `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel untrack`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			let monsters = []
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
				else if (element.match(/everything/gi)) {
					monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
				}
			})
			if (monsters.length) {
				monsters.forEach((monster) => {
					query.deleteByIdQuery('monsters', 'pokemon_id', `${monster}`, msg.channel.id)
				})
				msg.react('✅')
			}
			else msg.reply('404 NO MONSTERS FOUND')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel raid `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}

			const rawArgs = msg.content.slice(`${config.discord.prefix}channel raid`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const monsters = []
			let park = 0
			let distance = 0
			let team = 4
			let template = 3
			const levels = []

			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
			})
			args.forEach((element) => {
				if (element.match(/park/gi)) park = 1
				else if (element.match(/instinct/gi)) team = 3
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/valor/gi)) team = 2
				else if (element.match(/mystic/gi)) team = 1
				else if (element.match(/harmony/gi)) team = 0
				else if (element.match(/level\d/gi)) levels.push(element.replace(/level/gi, ''))
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}

			})

			if (monsters.length !== 0 && levels.length === 0) {
				const level = 0
				monsters.forEach((monster) => {
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						[`'${msg.channel.id}'`, `'${monster}'`, `'${template}'`, `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
					)
				})
				msg.react('✅')
				log.info(`${msg.author.username} started tracking ${monsters} in ${msg.channel.name}`)

			}
			else if (monsters.length === 0 && levels.length === 0) msg.reply('404 NO MONSTERS FOUND')
			else if (monsters.length !== 0 && levels.length !== 0) msg.reply('400 Can\'t track raids by name and level at the same time')
			else if (monsters.length === 0 && levels.length !== 0) {
				levels.forEach((level) => {
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						[`'${msg.channel.id}'`, '\'721\'', `'${template}'`, `'${distance}'`, `'${park}'`, `'${team}'`, `'${level}'`]
					)
				})
				msg.react('✅')
				log.info(`${msg.author.username} started tracking raid levels:${levels} raids in ${msg.channel.name} `)
			}
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel unraid`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel unraid`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			const monsters = []
			const levels = []
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
				if (element.match(/level\d/gi)) {
					levels.push(element.replace(/level/gi, ''))
				}
			})
			if (monsters.length) {
				monsters.forEach((monster) => {
					query.deleteByIdQuery('raid', 'pokemon_id', `${monster}`, msg.channel.id)
				})
				msg.react('✅')
			}
			if (levels.length) {
				levels.forEach((level) => {
					query.deleteByIdQuery('raid', 'level', `${level}`, msg.channel.id)
				})
				msg.react('✅')
			}
			if (!monsters.length && !levels.length) msg.reply('404 No raid bosses or levels found')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel egg `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel egg`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')
			let park = 0
			let level = 0
			let distance = 0
			let team = 4
			let template = 3
			args.forEach((element) => {
				if (element.match(/park/gi)) park = 1
				else if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/instinct/gi)) team = 3
				else if (element.match(/valor/gi)) team = 2
				else if (element.match(/mystic/gi)) team = 1
				else if (element.match(/harmony/gi)) team = 0
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}
			})
			if (level) {

				query.insertOrUpdateQuery(
					'egg',
					['id', 'raid_level', 'template', 'distance', 'park', 'team'],
					[`'${msg.channel.id}'`, `'${level}'`, `'${template}'`, `'${distance}'`, `'${park}'`, `'${team}'`]
				)

				msg.react('✅')
				log.info(`${msg.author.username} started tracking level${level} eggs`)
			}
			else msg.reply('404 NO MONSTERS FOUND')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel unegg`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel unegg`.length).split(' ')
			const args = rawArgs.join('|').toLowerCase().split('|')

			let level = false
			args.forEach((element) => {
				if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
			})
			if (level) {
				query.deleteByIdQuery('egg', 'raid_level', `${level}`, msg.channel.id)
				msg.react('✅')
			}
			else {
				msg.reply('404 Raid level not found')
			}
		})
	}

	else if (msg.content === `${config.discord.prefix}channel tracked`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			Promise.all([
				query.selectAllQuery('monsters', 'id', msg.channel.id),
				query.selectAllQuery('raid', 'id', msg.channel.id),
				query.selectAllQuery('egg', 'id', msg.channel.id),
				query.selectOneQuery('humans', 'id', msg.channel.id),
				query.selectAllQuery('quest', 'id', msg.channel.id),
			]).then((data) => {
				const monsters = data[0]
				const raids = data[1]
				const eggs = data[2]
				const human = data[3]
				const quests = data[4]
				const maplink = `https://www.google.com/maps/search/?api=1&query=${human.latitude},${human.longitude}`
				msg.reply(`👋\nYour location is currently set to ${maplink} \nand you currently are set to receive alarms in ${human.area}`)
				let message = ''
				if (monsters.length) {
					message = message.concat('\n\nYou\'re  tracking the following monsters:\n')
				}
				else message = message.concat('\n\nYou\'re not tracking any monsters')

				monsters.forEach((monster) => {
					const monsterName = monsterData[monster.pokemon_id].name
					let miniv = monster.min_iv
					if (miniv === -1) miniv = 0
					message = message.concat(`\n**${monsterName}** distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} minimum stats: ATK:${monster.atk} DEF:${monster.def} STA:${monster.sta}`)
				})
				if (raids.length || eggs.length) {
					message = message.concat('\n\nYou\'re tracking the following raids:\n')
				}
				else message = message.concat('\n\nYou\'re not tracking any raids')
				raids.forEach((raid) => {
					const monsterName = monsterData[raid.pokemon_id].name
					const raidTeam = teamData[raid.team].name
					if (parseInt(raid.pokemon_id, 10) === 721) {
						message = message.concat(`\n**level:${raid.level} raids** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`)
					}
					else {
						message = message.concat(`\n**${monsterName}** distance: ${raid.distance}m controlled by ${raidTeam} , must be in park: ${raid.park}`)
					}
				})
				eggs.forEach((egg) => {
					const raidTeam = teamData[egg.team].name
					message = message.concat(`\n**Level ${egg.raid_level} eggs** distance: ${egg.distance}m controlled by ${raidTeam} , must be in park: ${egg.park}`)

				})
				if (quests.length) {
					message = message.concat('\n\nYou\'re tracking the following quests:\n')
				}
				quests.forEach((quest) => {
					let rewardThing = ''
					if (quest.reward_type === 7) rewardThing = monsterData[quest.reward].name
					if (quest.reward_type === 3) rewardThing = `${quest.reward} or more stardust`
					if (quest.reward_type === 2) rewardThing = questDts.rewardItems[quest.reward]
					message = message.concat(`\nReward: ${rewardThing} distance: ${quest.distance}m `)
				})

				if (message.length < 6000) {
					msg.reply(message, { split: true })
				}
				else {
					const hastebinMessage = hastebin(message)
					hastebinMessage.then((hastelink) => {
						msg.reply(`${msg.channel.name} tracking list is quite long. Have a look at ${hastelink}`)
					})
						.catch((err) => {
							log.error(`Hastebin unhappy: ${err}`)
							msg.reply(`${msg.channel.name} tracking list is long, but Hastebin is also down. ☹️ \nPlease try again later.`)
						})
				}
			})
		})
	}
	else if (msg.content.startsWith(`${config.discord.prefix}channel quest `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			let monsters = []
			const items = []
			let distance = 0
			const questTracks = []
			let template = 3
			let minDust = 10000000
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel quest`.length)
			const args = rawArgs.toLowerCase().split(' ')
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (element.match(/stardust\d/gi)) minDust = element.replace(/stardust/gi, '')
				else if (element === 'stardust') minDust = 1
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
			})
			_.forEach(questDts.rewardItems, (item, key) => {
				const re = new RegExp(` ${item}`, 'gi')
				if (rawArgs.match(re)) items.push(key)
			})

			if (rawArgs.match(/all pokemon/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
			if (rawArgs.match(/all items/gi)) {
				_.forEach(questDts.rewardItems, (item, key) => {
					items.push(key)
				})
			}
			if (rawArgs.match(/stardust/gi)) {
				questTracks.push({
					id: msg.channel.id,
					reward: minDust,
					template: template,
					reward_type: 3,
					distance: distance
				})
			}
			monsters.forEach((pid) => {
				questTracks.push({
					id: msg.channel.id,
					reward: pid,
					template: template,
					reward_type: 7,
					distance: distance
				})
			})
			items.forEach((i) => {
				questTracks.push({
					id: msg.channel.id,
					reward: i,
					template: template,
					reward_type: 2,
					distance: distance
				})
			})
			questTracks.forEach((t) => {
				query.insertOrUpdateQuery(
					'quest',
					['id', 'reward', 'template', 'reward_type', 'distance'],
					[`'${t.id}'`, `'${t.reward}'`, `'${t.template}'`, `'${t.reward_type}'`, `'${t.distance}'`]
				).then((p) => {
					log.info(`${msg.channel.name} Added quest tracking`)
				})
			})
			msg.react('✅')

		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel remove quest `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		query.countQuery('id', 'humans', 'id', msg.channel.id).then((isregistered) => {
			if (!isregistered) {
				msg.reply(`${msg.channel.name} does not seem to be registered. add it with ${config.discord.prefix}channel add`)
				return null
			}
			let monsters = [0]
			const items = [0]
			let stardustTracking = 99999999
			const rawArgs = msg.content.slice(`${config.discord.prefix}channel remove quest `.length)
			const args = rawArgs.toLowerCase().split(' ')
			args.forEach((element) => {
				const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
				if (pid !== undefined) monsters.push(pid)
				else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
					const Type = element.replace(/\b\w/g, l => l.toUpperCase())
					_.filter(monsterData, (o, k) => {
						if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
							if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
						} return k
					})
				}
			})
			_.forEach(questDts.rewardItems, (item, key) => {
				const re = new RegExp(item, 'gi')
				if (rawArgs.match(re)) items.push(key)
			})
			if (rawArgs.match(/stardust/gi)) {
				stardustTracking = 0
			}
			if (rawArgs.match(/all pokemon/gi)) monsters = [...Array(config.general.max_pokemon).keys()].map(x => x += 1)
			if (rawArgs.match(/all items/gi)) {
				_.forEach(questDts.rewardItems, (item, key) => {
					items.push(key)
				})
			}

			const remQuery = `
			delete from quest WHERE id=${msg.channel.id} and 
			((reward_type = 2 and reward in(${items})) or (reward_type = 7 and reward in(${monsters})) or (reward_type = 3 and reward >= ${stardustTracking}))		
			`
			query.mysteryQuery(remQuery).then((t) => {
				log.info(`${msg.channel.name} removed quest tracking`)
			})
			msg.react('✅')

		})
	}

})

process.on('exit', (err) => {
	log.err(`Discord Commander died! ${err.message}`)
})

client.on('guildMemberRemove', (member) => {
	if (!client.users.keyArray().includes(member.id)) {
		query.countQuery('id', 'humans', 'id', member.id).then((isregistered) => {
			if (isregistered) {
				query.deleteQuery('egg', 'id', member.id)
				query.deleteQuery('monsters', 'id', member.id)
				query.deleteQuery('raid', 'id', member.id)
				query.deleteQuery('quest', 'id', member.id)
				query.deleteQuery('humans', 'id', member.id)
				log.info(`${member.username} left the server and was unregistered`)
			}
		})
	}
})

client.on('channelDelete', (channel) => {
	query.countQuery('id', 'humans', 'id', channel.id).then((isregistered) => {
		if (isregistered) {
			query.deleteQuery('egg', 'id', channel.id)
			query.deleteQuery('monsters', 'id', channel.id)
			query.deleteQuery('raid', 'id', channel.id)
			query.deleteQuery('quest', 'id', channel.id)
			query.deleteQuery('humans', 'id', channel.id)
			log.info(`text channel${channel.name} was deleted and unregistered`)
		}
	})
})

client.login(process.argv[2])
	.catch((err) => {
		log.error(`Discord unhappy: ${err.message}`)
		process.exit()
	})

migrator()

