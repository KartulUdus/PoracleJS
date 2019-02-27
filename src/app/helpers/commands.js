const { Client } = require('discord.js')
const _ = require('lodash')

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

client.on('error', (e) => {
	log.info(`Discord commando sent me an error, commiting seppuku just in case ${e.message}`)
	process.exit()
})

process.on('exit', () => {
	process.send({
		reason: 'seppuku'
	})
})

client.on('ready', () => {
	log.info(`Commander "${client.user.tag}" awaiting for orders!`)
	client.user.setPresence({
		game: {
			name: 'PoracleJS',
		}
	})

	query.selectAllQuery('humans', 'enabled', 1).then((humans) => {
		humans.forEach((human) => {
			const channels = client.channels.keyArray()
			const users = client.users.keyArray()
			if ((human.humanKind || 'discord') === 'discord' && !channels.includes(human.id) && !users.includes(human.id)) {
				log.log({ level: 'debug', message: `unregistered ${human.name}:${human.humanKind} due to 404`, event: 'discord:registerCheck' })

				query.deleteQuery('egg', 'id', human.id)
				query.deleteQuery('monsters', 'id', human.id)
				query.deleteQuery('raid', 'id', human.id)
				query.deleteQuery('quest', 'id', human.id)
				query.deleteQuery('humans', 'id', human.id)
			}
		})
	})
})

if (config.discord.userRole) {
	client.on('guildMemberUpdate', (oldMember, newMember) => {

		let before = false
		let after = false
		oldMember.roles.forEach((role) => {
			if (role.name === config.discord.userRole) before = true
		})
		newMember.roles.forEach((role) => {
			if (role.name === config.discord.userRole) after = true
		})

		if (!before && after) {
			query.countQuery('id', 'humans', 'id', oldMember.user.id)
				.then((isregistered) => {
					if (!isregistered) {
						query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[oldMember.user.id, emojiStrip(oldMember.user.username), '[]']])
						oldMember.user.send(dts.greeting)
						log.log({ level: 'debug', message: `registered ${oldMember.user.name} because ${config.discord.userRole} role removed`, event: 'discord:roleCheck' })

					}
				})
				.catch((err) => {
					log.error(`Role based registration errored with: ${err.message}`)
				})
		}

		if (before && !after) {
			query.countQuery('id', 'humans', 'id', oldMember.user.id)
				.then((isregistered) => {
					if (isregistered) {
						query.deleteQuery('egg', 'id', oldMember.user.id)
						query.deleteQuery('monsters', 'id', oldMember.user.id)
						query.deleteQuery('raid', 'id', oldMember.user.id)
						query.deleteQuery('quest', 'id', oldMember.user.id)
						query.deleteQuery('humans', 'id', oldMember.user.id)
						log.log({ level: 'debug', message: `unregistered ${oldMember.user.name} because ${config.discord.userRole} role removed`, event: 'discord:roleCheck' })
					}
				})
				.catch((err) => {
					log.error(`Role based unregistration errored with: ${err.message}`)
				})
		}
	})
}


client.on('message', (msg) => {
	log.log({ level: 'debug', message: `got a message: ${msg.content}` })
	function registerHuman(id, name, registeredWhat, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((exists) => {
				if (exists) {
					msg.react('👌')
					return null
				}
				query.insertOrUpdateQuery('humans', ['id', 'name', 'area', 'humanKind'], [[`${id}`, `${emojiStrip(name)}`, '[]', `${humanKind}`]])
				msg.react('✅')
				msg.reply(`${name} has been registered`)
				log.log({
					level: 'debug',
					message: `${msg.author.username} registered ${name}`,
					event: registeredWhat,
				})

			})
			.catch((err) => {
				log.error(`uh oh ${err}`)
			})
	}

	function unregisterHuman(id, name, eventName, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (isregistered) {
					msg.react('👌')
					return null
				}
				query.deleteQuery('egg', 'id', id)
				query.deleteQuery('monsters', 'id', id)
				query.deleteQuery('raid', 'id', id)
				query.deleteQuery('humans', 'id', id)
				msg.react('✅')
				log.log({
					level: 'debug',
					message: `${msg.author.username} unregistered ${name}`,
					event: eventName,
				})
			})
	}

	function registerLocation(id, name, registerHelpText, search, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				query.geolocate(search)
					.then((location) => {
						query.updateLocation('humans', location[0].latitude, location[0].longitude, 'id', id)
						const maplink = `https://www.google.com/maps/search/?api=1&query=${location[0].latitude},${location[0].longitude}`
						msg.reply(`:wave:, I set ${name}'s location to : \n${maplink}`)
						msg.react('✅')
					})
			})
	}

	function startHuman(name, registerHelpText, id, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				query.updateQuery('humans', 'enabled', true, 'id', id)
				msg.react('✅')
				log.log({
					level: 'debug',
					message: `${msg.author.username} enabled alarms for ${name}`,
					event: eventText,
				})
			})
	}

	function stopHuman(id, name, registerHelpText, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				query.updateQuery('humans', 'enabled', false, 'id', id)
				msg.react('✅')
				log.log({
					level: 'debug',
					message: `${msg.author.username} enabled alarms in ${name}`,
					event: eventText,
				})
			})
	}

	function areaAdd(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} - ${id} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|')
					.toLowerCase()
					.split('|')
				const confAreas = geofence.map(area => area.name.toLowerCase())
				query.selectOneQuery('humans', 'id', id)
					.then((row) => {
						const oldArea = JSON.parse(row.area.split())
						const validAreas = confAreas.filter(x => args.includes(x))
						const addAreas = validAreas.filter(x => !oldArea.includes(x))
						let newAreas = oldArea.concat(addAreas)
						newAreas = newAreas.filter(n => n)
						if (addAreas.length !== 0) {
							query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', id)
						}
						if (validAreas.length) {
							if (addAreas.length) {
								msg.reply(`Added areas: ${addAreas}`)
								log.log({
									level: 'debug',
									message: `${msg.author.username} added areas ${addAreas} to ${name}`,
									event: eventText,
								})
							}
							else {
								msg.react('👌')
							}
						}
						else {
							msg.reply(`no valid areas there, please use one of ${confAreas}`)
						}
					})
			})
	}

	function areaRemove(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|')
					.toLowerCase()
					.split('|')
				const confAreas = geofence.map(area => area.name.toLowerCase())
				query.selectOneQuery('humans', 'id', id)
					.then((row) => {
						const oldArea = JSON.parse(row.area.split())
						const validAreas = oldArea.filter(x => args.includes(x))
						const removeAreas = validAreas.filter(x => oldArea.includes(x))
						const newAreas = oldArea.filter(x => !removeAreas.includes(x))
						if (removeAreas.length !== 0) {
							query.updateQuery('humans', 'area', JSON.stringify(newAreas), 'id', id)
						}
						if (validAreas.length !== 0) {
							if (removeAreas.length !== 0) {
								msg.reply(`Removed areas: ${removeAreas}`)
								log.log({
									level: 'debug',
									message: `${msg.author.username} removed areas ${removeAreas} from ${name}`,
									event: eventText,
								})
							}
							else {
								msg.react('👌')
							}
						}
						else {
							msg.reply(`404 NO VALID AND TRACKED AREAS FOUND \n VALID: ${confAreas} \n TRACKED: ${oldArea}`)
						}
					})
			})
	}

	function monsterTrack(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|').toLowerCase().split('|')
				let monsters = []
				let distance = '0'
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
					const insertData = monsters.map(monster => [id, monster, template, distance, iv, maxiv, cp, maxcp, level, maxlevel, atk, def, sta, weight, maxweight, form])
					query.insertOrUpdateQuery(
						'monsters',
						['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
						insertData
					)
					msg.react('✅')
					log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters} in ${name}`, event: eventText })

				}
				else if (monsters.length > 1 && forms.length !== 0) msg.reply('Form filters can be added to 1 monster at a time')
				else if (monsters.length === 0) msg.reply('404 NO MONSTERS FOUND')
				else if (monsters.length === 1 && forms.length) {
					if (_.has(formData, monsters[0])) {
						const fids = []
						forms.forEach((form) => {
							const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form)
							if (fid !== undefined) fids.push(fid)
						})
						const insertData = fids.map(form => [id, monsters[0], template, distance, iv, maxiv, cp, maxcp, level, maxlevel, atk, def, sta, weight, maxweight, form])
						query.insertOrUpdateQuery(
							'monsters',
							['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
							insertData
						)
						if (fids.length > 0) {
							msg.react('✅')
							log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters[0]}, forms ${fids} in ${name}`, event: eventText })
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

	function monsterUntrack(id, name, registerHelpText, rawArgs, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|')
					.toLowerCase()
					.split('|')
				let monsters = []
				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) {
						monsters.push(pid)
					}
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							}
							return k
						})
					}
					else if (element.match(/everything/gi)) {
						monsters = [...Array(config.general.max_pokemon)
							.keys()].map(x => x += 1)
					}
				})
				if (monsters.length) {
					monsters.forEach((monster) => {
						query.deleteByIdQuery('monsters', 'pokemon_id', `${monster}`, id)
					})
					msg.react('✅')
				}
				else {
					msg.reply('404 NO MONSTERS FOUND')
				}
			})
	}

	function raidTrack(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
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
					if (element.match(/ex/gi)) park = 1
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
					const insertData = monsters.map(monster => [id, monster, template, distance, park, team, level])
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						insertData
					)
					msg.react('✅')
					log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters} in ${name}`, event: eventText })

				}
				else if (monsters.length === 0 && levels.length === 0) msg.reply('404 NO MONSTERS FOUND')
				else if (monsters.length !== 0 && levels.length !== 0) msg.reply('400 Can\'t track raids by name and level at the same time')
				else if (monsters.length === 0 && levels.length !== 0) {
					const insertData = levels.map(level => [id, 721, template, distance, park, team, level])
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						insertData
					)
					msg.react('✅')
					log.log({ level: 'debug', message: `${msg.author.username} started tracking raid levels:${levels} raids in ${name} `, event: eventText })
				}
			})
	}

	function raidUntrack(id, registerHelpText, rawArgs, name, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|')
					.toLowerCase()
					.split('|')
				const monsters = []
				const levels = []
				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) {
						monsters.push(pid)
					}
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							}
							return k
						})
					}
					if (element.match(/level\d/gi)) {
						levels.push(element.replace(/level/gi, ''))
					}
				})
				if (monsters.length) {
					monsters.forEach((monster) => {
						query.deleteByIdQuery('raid', 'pokemon_id', `${monster}`, id)
					})
					log.log({
						level: 'debug',
						message: `${msg.author.username} removed tracking raid monsters:${monsters} raids in ${name} `,
						event: eventText,
					})
					msg.react('✅')
				}
				if (levels.length) {
					levels.forEach((level) => {
						query.deleteByIdQuery('raid', 'level', `${level}`, id)
					})
					log.log({
						level: 'debug',
						message: `${msg.author.username} removed tracking raid level:${levels} raids in ${name} `,
						event: eventText,
					})
					msg.react('✅')
				}
				if (!monsters.length && !levels.length) msg.reply('404 No raid bosses or levels found')
			})
	}

	function eggTrack(id, registerHelpText, rawArgs, name, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|').toLowerCase().split('|')
				let park = 0
				const levels = []
				let distance = 0
				let team = 4
				let template = 3
				args.forEach((element) => {
					if (element.match(/ex/gi)) park = 1
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
				if (levels.length) {
					const insertData = levels.map(level => [id, level, template, distance, park, team])
					query.insertOrUpdateQuery(
						'egg',
						['id', 'raid_level', 'template', 'distance', 'park', 'team'],
						insertData
					)
					msg.react('✅')
					log.log({ level: 'debug', message: `${msg.author.username} started tracking level (${levels.join(',')}) eggs`, event: eventText })
				}
				else msg.reply('404 NO EGGS FOUND')
			})
	}

	function eggUntrack(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				const args = rawArgs.join('|')
					.toLowerCase()
					.split('|')
				let level = false
				args.forEach((element) => {
					if (element.match(/level\d/gi)) level = element.replace(/level/gi, '')
				})
				if (level) {
					query.deleteByIdQuery('egg', 'raid_level', `${level}`, id)
					msg.react('✅')
					log.log({
						level: 'debug',
						message: `${msg.author.username} started untracked level ${level} eggs in ${name}`,
						event: eventText,
					})

				}
				else {
					msg.reply('404 Raid level not found')
				}
			})
	}

	function showTracked(id, name, registerHelpText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				Promise.all([
					query.selectAllQuery('monsters', 'id', id),
					query.selectAllQuery('raid', 'id', id),
					query.selectAllQuery('egg', 'id', id),
					query.selectOneQuery('humans', 'id', id),
					query.selectAllQuery('quest', 'id', id),
				])
					.then((data) => {
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
						else {
							message = message.concat('\n\nYou\'re not tracking any monsters')
						}

						monsters.forEach((monster) => {
							const monsterName = monsterData[monster.pokemon_id].name
							let miniv = monster.min_iv
							if (miniv === -1) miniv = 0
							message = message.concat(`\n**${monsterName}** distance: ${monster.distance}m iv: ${miniv}%-${monster.max_iv}% cp: ${monster.min_cp}-${monster.max_cp} level: ${monster.min_level}-${monster.max_level} minimum stats: ATK:${monster.atk} DEF:${monster.def} STA:${monster.sta}`)
						})
						if (raids.length || eggs.length) {
							message = message.concat('\n\nYou\'re tracking the following raids:\n')
						}
						else {
							message = message.concat('\n\nYou\'re not tracking any raids')
						}
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
						log.log({
							level: 'debug',
							message: `${msg.author.username} checked trackings`,
							event: 'discord:trackedChannel',
						})

						if (message.length < 6000) {
							msg.reply(message, { split: true })
						}
						else {
							const hastebinMessage = hastebin(message)
							hastebinMessage.then((hastelink) => {
								msg.reply(`${name} tracking list is quite long. Have a look at ${hastelink}`)
							})
								.catch((err) => {
									log.error(`Hastebin unhappy: ${err.message}`)
									msg.reply(`${name} tracking list is long, but Hastebin is also down. ☹️ \nPlease try again later.`)
								})
						}
					})
			})
	}

	function questAdd(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				let monsters = []
				const items = []
				let distance = 0
				const questTracks = []
				let template = 3
				let mustShiny = 0
				let minDust = 10000000
				const args = rawArgs.toLowerCase()
					.split(' ')
				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) {
						monsters.push(pid)
					}
					else if (element.match(/stardust\d/gi)) {
						minDust = element.replace(/stardust/gi, '')
					}
					else if (element === 'stardust') {
						minDust = 1
					}
					else if (element === 'shiny') {
						mustShiny = 1
					}
					else if (element.match(/d\d/gi)) {
						distance = element.replace(/d/gi, '')
						if (distance.length >= 10) distance = distance.substr(0, 9)
					}
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							}
							return k
						})
					}
					else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				})
				_.forEach(questDts.rewardItems, (item, key) => {
					const re = new RegExp(` ${item}`, 'gi')
					if (rawArgs.match(re)) items.push(key)
				})

				if (rawArgs.match(/all pokemon/gi)) {
					monsters = [...Array(config.general.max_pokemon)
						.keys()].map(x => x += 1)
				}
				if (rawArgs.match(/all items/gi)) {
					_.forEach(questDts.rewardItems, (item, key) => {
						items.push(key)
					})
				}
				if (rawArgs.match(/stardust/gi)) {
					questTracks.push({
						id: id,
						reward: minDust,
						mustShiny: 0,
						template: template,
						reward_type: 3,
						distance: distance,
					})
				}
				monsters.forEach((pid) => {
					questTracks.push({
						id: id,
						reward: pid,
						mustShiny: mustShiny,
						template: template,
						reward_type: 7,
						distance: distance
					})
				})
				items.forEach((i) => {
					questTracks.push({
						id: id,
						reward: i,
						mustShiny: 0,
						template: template,
						reward_type: 2,
						distance: distance
					})
				})
				const insertData = questTracks.map(t => [t.id, t.reward, t.template, t.reward_type, t.distance, t.mustShiny])
				query.insertOrUpdateQuery(
					'quest',
					['id', 'reward', 'template', 'reward_type', 'distance', 'shiny'],
					insertData
				)
				log.log({ level: 'debug', message: `${msg.author.username} updated quest trackings in ${name}`, event: eventText })

				msg.react('✅')
			})
	}

	function questRemove(id, name, registerHelpText, rawArgs, eventText, humanKind = 'discord') {
		query.getHuman(id, humanKind)
			.then((isregistered) => {
				if (!isregistered) {
					msg.reply(`${name} does not seem to be registered. add it with ${registerHelpText}`)
					return null
				}
				let monsters = [0]
				const items = [0]
				let stardustTracking = 99999999
				const args = rawArgs.toLowerCase()
					.split(' ')
				args.forEach((element) => {
					const pid = _.findKey(monsterData, mon => mon.name.toLowerCase() === element)
					if (pid !== undefined) {
						monsters.push(pid)
					}
					else if (_.has(typeData, element.replace(/\b\w/g, l => l.toUpperCase()))) {
						const Type = element.replace(/\b\w/g, l => l.toUpperCase())
						_.filter(monsterData, (o, k) => {
							if (_.includes(o.types, Type) && k < config.general.max_pokemon) {
								if (!_.includes(monsters, parseInt(k, 10))) monsters.push(parseInt(k, 10))
							}
							return k
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
				if (rawArgs.match(/all pokemon/gi)) {
					monsters = [...Array(config.general.max_pokemon)
						.keys()].map(x => x += 1)
				}
				if (rawArgs.match(/all items/gi)) {
					_.forEach(questDts.rewardItems, (item, key) => {
						items.push(key)
					})
				}

				const remQuery = `
			delete from quest WHERE id=${id} and 
			((reward_type = 2 and reward in(${items})) or (reward_type = 7 and reward in(${monsters})) or (reward_type = 3 and reward >= ${stardustTracking}))		
			`
				query.mysteryQuery(remQuery)
					.then((t) => {
						log.log({
							level: 'debug',
							message: `${msg.author.username} removed quest trackings in ${name}`,
							event: eventText,
						})
					})
				msg.react('✅')

			})
	}


	/*
	 _   _ _   _       _____ _   _     ___   _____             _____ _   _ ___   ___
	( ) ( ( ) ( /'\_/`(  _  ( ) ( )   (  _`\(  _  /'\_/`/'\_/`(  _  ( ) ( (  _`\(  _`\
	| |_| | | | |     | (_) | `\| |   | ( (_| ( ) |     |     | (_) | `\| | | ) | (_(_)
	|  _  | | | | (_) |  _  | , ` |   | |  _| | | | (_) | (_) |  _  | , ` | | | `\__ \
	| | | | (_) | | | | | | | |`\ |   | (_( | (_) | | | | | | | | | | |`\ | |_) ( )_) |
	(_) (_(_____(_) (_(_) (_(_) (_)   (____/(_____(_) (_(_) (_(_) (_(_) (_(____/`\____)
	Human commands
	*/


	if (msg.content === `${config.discord.prefix}poracle` && msg.channel.name === config.discord.channel) {
		query.countQuery('id', 'humans', 'id', msg.author.id)
			.then((isregistered) => {
				if (isregistered) msg.react('👌')
				if (!isregistered) {
					query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[msg.author.id, emojiStrip(msg.author.username), []]])
					msg.react('✅')
					msg.author.send(dts.greeting)
					log.log({ level: 'debug', message: `${msg.author.tag} registered`, event: 'discord:registered' })

				}
			})
			.catch((err) => {
				log.error(`Commander !poracle errored with: ${err.message}`)
			})
	}

	else if (msg.content === `${config.discord.prefix}unregister`) {
		query.countQuery('id', 'humans', 'id', msg.author.id)
			.then((isregistered) => {
				if (!isregistered) msg.react('👌')
				if (isregistered) {
					msg.react('👌')
					return null
				}

				query.insertOrUpdateQuery('humans', ['id', 'name', 'area'], [[msg.channel.id, emojiStrip(msg.channel.name), '[]']])
				msg.react('✅')
				log.log({
					level: 'debug',
					message: `${msg.author.tag} unregistered`,
					event: 'discord:unregistered'
				})
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
					log.log({ level: 'debug', message: `${msg.author.tag} unregistered ${target.tag}`, event: 'discord:unregistered' })

				}
			})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}location `)) {
		if (msg.channel.type !== 'dm') {
			msg.author.send('Please run commands in Direct Messages')
			log.log({ level: 'debug', message: `${msg.author.tag} set location`, event: 'discord:location' })
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
			log.log({ level: 'debug', message: `${msg.author.tag} enabled alarms`, event: 'discord:enable' })
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
			log.log({ level: 'debug', message: `${msg.author.tag} disabled alarms`, event: 'discord:disable' })
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
					log.log({ level: 'debug', message: `${msg.author.tag} added area ${addAreas}`, event: 'discord:areaAdd' })
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
					log.log({ level: 'debug', message: `${msg.author.tag} removed area ${removeAreas}`, event: 'discord:areaRemove' })
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
				const insertData = monsters.map(pokemonId => [msg.author.id, pokemonId, template, distance, iv, maxiv, cp, maxcp, level, maxlevel, atk, def, sta, weight, maxweight, form])
				query.insertOrUpdateQuery(
					'monsters',
					['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
					insertData
				)

				msg.react('✅')
				log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters}`, event: 'discord:track' })

			}
			else if (monsters.length > 1 && forms.length) {
				msg.reply('Form filters can be added to 1 monster at a time')
			}
			else if (!monsters.length) {
				msg.reply('404 NO MONSTERS FOUND')
			}
			else if (monsters.length === 1 && forms.length) {
				if (!_.has(formData, monsters[0])) {
					msg.reply(`Sorry, ${monsters[0]} doesn't have forms`)
					return null
				}

				const fids = []
				forms.forEach((form) => {
					const fid = _.findKey(formData[monsters[0]], monforms => monforms.toLowerCase() === form)
					if (fid !== undefined) fids.push(fid)
				})
				const insertData = fids.map(form => [msg.author.id, monsters[0], template, distance, iv, maxiv, cp, maxcp, level, maxlevel, atk, def, sta, weight, maxweight, form])
				log.log({ level: 'debug', message: `${msg.author.username} started tracking ${monsters[0]} form: ${fids}`, event: 'discord:track' })
				query.insertOrUpdateQuery(
					'monsters',
					['id', 'pokemon_id', 'template', 'distance', 'min_iv', 'max_iv', 'min_cp', 'max_cp', 'min_level', 'max_level', 'atk', 'def', 'sta', 'min_weight', 'max_weight', 'form'],
					insertData
				)
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
						.then(log.log({ level: 'debug', message: `${msg.author.username} removed pokemon tracking ${monsterData[monster].name}`, event: 'discord:untrack' }))
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


		query.countQuery('id', 'humans', 'id', msg.author.id)
			.then((isregistered) => {
				if (!isregistered) {
					msg.author.send(`You don't seem to be registered. \nYou can do this by sending ${config.discord.prefix}poracle to #${config.discord.channel}`)
					return null
				}
				const rawArgs = msg.content.slice(`${config.discord.prefix}track`.length)
					.split(' ')
				const args = rawArgs.join('|')
					.toLowerCase()
					.split('|')
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
							}
							return k
						})
					}
				})
				args.forEach((element) => {
					if (element.match(/ex/gi)) park = 1
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
					const insertData = monsters.map(monster => [msg.author.id, monster, template, distance, park, team, level])
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						insertData
					)
					log.log({
						level: 'debug',
						message: `${msg.author.username} started tracking ${monsters} raids`,
						event: 'discord:raid'
					})

					msg.react('✅')

				}
				else if (monsters.length === 0 && levels.length === 0) msg.reply('404 NO MONSTERS FOUND')
				else if (monsters.length !== 0 && levels.length !== 0) msg.reply('400 Can\'t track raids by name and level at the same time')
				else if (monsters.length === 0 && levels.length !== 0) {
					const insertData = levels.map(level => [msg.author.id, 721, template, distance, park, team, level])
					query.insertOrUpdateQuery(
						'raid',
						['id', 'pokemon_id', 'template', 'distance', 'park', 'team', 'level'],
						insertData
					)
					log.log({
						level: 'debug',
						message: `${msg.author.username} started tracking level ${levels} raids`,
						event: 'discord:raid'
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
				})
				log.log({ level: 'debug', message: `${msg.author.username} stopped tracking ${monsters} raids`, event: 'discord:unraid' })
				msg.react('✅')
			}
			if (levels.length) {
				levels.forEach((level) => {
					query.deleteByIdQuery('raid', 'level', `${level}`, msg.author.id)
				})
				log.log({ level: 'debug', message: `${msg.author.username} stopped tracking level ${levels} raids`, event: 'discord:unraid' })

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
			const levels = []
			let team = 4
			let template = 3

			args.forEach((element) => {
				if (element.match(/ex/gi)) park = 1
				else if (element.match(/template[1-5]/gi)) template = element.replace(/template/gi, '')
				else if (element.match(/level\d/gi)) levels.push(element.replace(/level/gi, ''))
				else if (element.match(/instinct/gi)) team = 3
				else if (element.match(/valor/gi)) team = 2
				else if (element.match(/mystic/gi)) team = 1
				else if (element.match(/harmony/gi)) team = 0
				else if (element.match(/d\d/gi)) {
					distance = element.replace(/d/gi, '')
					if (distance.length >= 10) distance = distance.substr(0, 9)
				}

			})

			if (levels.length) {
				const insertData = levels.map(level => [msg.author.id, level, template, distance, park, team])
				query.insertOrUpdateQuery(
					'egg',
					['id', 'raid_level', 'template', 'distance', 'park', 'team'],
					insertData
				)
				msg.react('✅')
				log.log({ level: 'debug', message: `${msg.author.username} started tracking level (${levels.join(', ')}) eggs`, event: 'discord:egg' })
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
				log.log({ level: 'debug', message: `${msg.author.username} started tracking level ${level} eggs`, event: 'discord:unegg' })
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
				log.log({ level: 'debug', message: `${msg.author.username} checked trackings`, event: 'discord:tracked' })

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
							log.error(`Hastebin unhappy: ${err.message}`)

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
			let mustShiny = 0
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
				else if (element === 'shiny') mustShiny = 1
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
					mustShiny: 0,
					reward_type: 3,
					distance: distance
				})
			}
			monsters.forEach((pid) => {
				questTracks.push({
					id: msg.author.id,
					reward: pid,
					template: template,
					mustShiny: mustShiny,
					reward_type: 7,
					distance: distance
				})
			})
			items.forEach((i) => {
				questTracks.push({
					id: msg.author.id,
					reward: i,
					template: template,
					mustShiny: 0,
					reward_type: 2,
					distance: distance
				})
			})
			const insertData = questTracks.map(t => [t.id, t.reward, t.template, t.reward_type, t.distance, t.mustShiny])
			query.insertOrUpdateQuery(
				'quest',
				['id', 'reward', 'template', 'reward_type', 'distance', 'shiny'],
				insertData
			)
			log.log({ level: 'debug', message: `${msg.author.username} added quest trackings`, event: 'discord:quest' })
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
				log.log({ level: 'debug', message: `${msg.author.username} removed quest trackings`, event: 'discord:questRemove' })
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
	Channel Commands
	*/

	else if (msg.content === `${config.discord.prefix}channel add`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registeredWhat = 'discord:registeredChannel'
		registerHuman(id, name, registeredWhat)
	}

	else if (msg.content === `${config.discord.prefix}channel remove`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}

		const eventName = 'discord:unregisteredChannel'
		const { id, name } = msg.channel
		unregisterHuman(id, name, eventName)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel location `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const search = msg.content.split(`${config.discord.prefix}channel location `).pop()
		const registerHelpText = `${config.discord.prefix}channel add`
		registerLocation(id, name, registerHelpText, search)
	}

	else if (msg.content === `${config.discord.prefix}channel start`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const eventText = 'discord:startChannel'
		startHuman(name, registerHelpText, id, eventText)
	}

	else if (msg.content === `${config.discord.prefix}channel stop`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const eventText = 'discord:stopChannel'
		stopHuman(id, name, registerHelpText, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel area add `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const eventText = 'discord:areaAddChannel'
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel area add`.length).split(' ')
		areaAdd(id, name, registerHelpText, rawArgs, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel area remove `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const eventText = 'discord:areaRemoveChannel'
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel area remove`.length).split(' ')
		areaRemove(id, name, registerHelpText, rawArgs, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel track `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const eventText = 'discord:trackChannel'
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel track`.length).split(' ')
		monsterTrack(id, name, registerHelpText, rawArgs, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel untrack `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel untrack`.length).split(' ')
		monsterUntrack(id, name, registerHelpText, rawArgs)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel raid `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel raid`.length).split(' ')
		const eventText = 'discord:raidChannel'
		raidTrack(id, name, registerHelpText, rawArgs, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel unraid`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel unraid`.length).split(' ')
		const eventText = 'discord:unraidChannel'
		raidUntrack(id, registerHelpText, rawArgs, name, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel egg `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel egg`.length).split(' ')
		const eventText = 'discord:eggChannel'
		eggTrack(id, registerHelpText, rawArgs, name, eventText)
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel unegg`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel unegg`.length).split(' ')
		const eventText = 'discord:uneggChannel'
		eggUntrack(id, name, registerHelpText, rawArgs, eventText)
	}

	else if (msg.content === `${config.discord.prefix}channel tracked`) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		showTracked(id, name, registerHelpText)
	}
	else if (msg.content.startsWith(`${config.discord.prefix}channel quest `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel quest`.length)
		const eventText = 'discord:questChannel'
		questAdd(id, name, registerHelpText, rawArgs, eventText)
	}
	else if (msg.content.startsWith(`${config.discord.prefix}channel remove quest `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const { id, name } = msg.channel
		const registerHelpText = `${config.discord.prefix}channel add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}channel remove quest `.length)
		const eventText = 'discord:questRemoveChannel'
		questRemove(id, name, registerHelpText, rawArgs, eventText)
	}

	/*
  __          ________ ____  _    _  ____   ____  _  __   _____ ____  __  __ __  __          _   _ _____   _____
 \ \        / /  ____|  _ \| |  | |/ __ \ / __ \| |/ /  / ____/ __ \|  \/  |  \/  |   /\   | \ | |  __ \ / ____|
  \ \  /\  / /| |__  | |_) | |__| | |  | | |  | | ' /  | |   | |  | | \  / | \  / |  /  \  |  \| | |  | | (
   \ \/  \/ / |  __| |  _ <|  __  | |  | | |  | |  <   | |   | |  | | |\/| | |\/| | / /\ \ | . ` | |  | |\___ \
    \  /\  /  | |____| |_) | |  | | |__| | |__| | . \  | |___| |__| | |  | | |  | |/ ____ \| |\  | |__| |____) |
     \/  \/   |______|____/|_|  |_|\____/ \____/|_|\_\  \_____\____/|_|  |_|_|  |_/_/    \_\_| \_|_____/|_____/
		Webhook commands
	 */

	else if (msg.content.startsWith(`${config.discord.prefix}webhook add`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook add `.length).split(' ')
		if (rawArgs.length >= 2) {
			const [name, id] = rawArgs
			const registeredWhat = 'discord:registeredWebhook'
			registerHuman(id, name, registeredWhat, 'webhook')
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook remove`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}

		const eventName = 'discord:unregisteredWebhook'
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook remove `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook').then((id) => {
				unregisterHuman(id, name, eventName, 'webhook')
			})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook location `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook location `.length).toLowerCase().split(' ')
		const registerHelpText = `${config.discord.prefix}webhook add`
		if (rawArgs.length > 2) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook').then((id) => {
				const search = msg.content.split(`${config.discord.prefix}webhook location ${name} `).pop()
				registerLocation(id, name, registerHelpText, search, 'webhook')
			})
		}

	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook start`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook location `.length).toLowerCase().split(' ')
		const [name] = rawArgs
		query.getHumanByName(name, 'webhook').then((id) => {
			const registerHelpText = `${config.discord.prefix}webhook add`
			const eventText = 'discord:startWebhook'
			startHuman(name, registerHelpText, id, eventText, 'webhook')
		})
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook stop`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const eventText = 'discord:stopWebhook'
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook stop `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook').then((id) => {
				stopHuman(id, name, registerHelpText, eventText, 'webhook')
			})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook area add `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const eventText = 'discord:areaAddWebhook'
		let rawArgs = msg.content.slice(`${config.discord.prefix}webhook area add `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook').then((id) => {
				rawArgs = msg.content.slice(`${config.discord.prefix}webhook area add ${name}`.length)
					.split(' ')
				areaAdd(id, name, registerHelpText, rawArgs, eventText, 'webhook')
			})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}channel area remove `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const eventText = 'discord:areaRemoveWebhook'
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook area remove `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook').then((id) => {
				const rawTrueArgs = msg.content.slice(`${config.discord.prefix}channel area remove ${name} `.length)
					.split(' ')
				areaRemove(id, name, registerHelpText, rawTrueArgs, eventText, 'webhook')
			})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook track `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const eventText = 'discord:trackChannel'
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook track `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook track ${name}`.length)
						.split(' ')
					monsterTrack(id, name, registerHelpText, rawArgs2, eventText, 'webhook')
				})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook untrack `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook untrack `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook untrack ${name}`.length)
						.split(' ')
					monsterUntrack(id, name, registerHelpText, rawArgs2, 'webhook')
				})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook raid `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook raid `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const eventText = 'discord:raidWebhook'
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook raid ${name}`.length)
						.split(' ')
					raidTrack(id, name, registerHelpText, rawArgs2, eventText, 'webhook')
				})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook unraid`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook unraid `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook unraid ${name}`.length)
						.split(' ')
					const eventText = 'discord:unraidWebhook'
					raidUntrack(id, registerHelpText, rawArgs2, name, eventText, 'webhook')
				})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook egg `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`

		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook egg `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook egg ${name}`.length)
						.split(' ')
					const eventText = 'discord:eggWebhook'
					eggTrack(id, registerHelpText, rawArgs2, name, eventText, 'webhook')
				})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook unegg`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook unegg `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const registerHelpText = `${config.discord.prefix}webhook add`
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook unegg ${name}`.length)
						.split(' ')
					const eventText = 'discord:uneggChannel'
					eggUntrack(id, name, registerHelpText, rawArgs2, eventText, 'webook')
				})
		}
	}

	else if (msg.content.startsWith(`${config.discord.prefix}webhook tracked`)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const registerHelpText = `${config.discord.prefix}webhook add`
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook tracked `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					showTracked(id, name, registerHelpText, 'webhook')
				})
		}
	}
	else if (msg.content.startsWith(`${config.discord.prefix}webhook quest `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook quest `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const registerHelpText = `${config.discord.prefix}webhook add`
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook quest ${name}`.length)
					const eventText = 'discord:questWebhook'
					questAdd(id, name, registerHelpText, rawArgs2, eventText, 'webhook')
				})
		}
	}
	else if (msg.content.startsWith(`${config.discord.prefix}webhook remove quest `)) {
		if (!_.includes(config.discord.admins, msg.author.id) || msg.channel.type !== 'text') {
			return null
		}
		const rawArgs = msg.content.slice(`${config.discord.prefix}webhook track `.length).toLowerCase().split(' ')
		if (rawArgs.length > 0) {
			const [name] = rawArgs
			query.getHumanByName(name, 'webhook')
				.then((id) => {
					const registerHelpText = `${config.discord.prefix}webhook add`
					const rawArgs2 = msg.content.slice(`${config.discord.prefix}webhook remove quest ${name}`.length)
					const eventText = 'discord:questRemoveWebhook'
					questRemove(id, name, registerHelpText, rawArgs2, eventText, 'webhook')
				})
		}
	}
})

process.on('exit', (err) => {
	log.error(`Discord Commander died! ${err.message}`)
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
				log.log({ level: 'debug', message: `user ${member.tag} was deleted and unregistered`, event: 'discord:registerCheck' })
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
			log.log({ level: 'debug', message: `text channel${channel.name} was deleted and unregistered`, event: 'discord:registerCheck' })

		}
	})
})

client.login(process.argv[2])
	.catch((err) => {
		log.error(`Discord commando unhappy: ${err.message}`)
		process.exit()
	})

migrator()

