//
// Quest controller getReward and getQuest function inspired from PMSF
//
// ....because it is smartly done there!!
//
// const pokemonGif = require('pokemon-gif')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')
const { log } = require('../lib/logger')

const questTypeList = require('../util/questTypeList')
// const itemList = require('../util/quests/items')
const pokemonTypes = ['unset', 'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy']
const gruntCharacterTypes = ['unset', 'Team Leader(s)', 'Team GO Rocket Grunt(s)', 'Arlo', 'Cliff', 'Sierra', 'Giovanni']

class Quest extends Controller {
	async questWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, quest.distance, quest.clean, quest.ping, quest.template from quest
		join humans on (humans.id = quest.id and humans.current_profile_no = quest.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and
		(((reward_type=7 and reward in (${data.rewardData.monsters}) and shiny = 1 and ${data.isShiny}=1) or (reward_type=7 and reward in (${data.rewardData.monsters}) and shiny = 0))
		or (reward_type = 2 and reward in (${data.rewardData.items}))
		or (reward_type = 3 and reward <= ${data.dustAmount})
		or (reward_type = 12 and reward in (${data.energyMonsters}) and ${data.rewardData.energyAmount}>0))
`

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			and
			(
				(
					round(
						6371000
						* acos(cos( radians(${data.latitude}) )
						* cos( radians( humans.latitude ) )
						* cos( radians( humans.longitude ) - radians(${data.longitude}) )
						+ sin( radians(${data.latitude}) )
						* sin( radians( humans.latitude ) )
						)
					) < quest.distance and quest.distance != 0)
					or
					(
						quest.distance = 0 and (${areastring})
					)
			)
			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, quest.distance, quest.clean, quest.ping, quest.template
			`)
		} else {
			query = query.concat(`
				and ((quest.distance = 0 and (${areastring})) or quest.distance > 0)
			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, quest.distance, quest.clean, quest.ping, quest.template
			`)
		}

		// this.log.silly(`${data.pokestop_id}: Query ${query}`)
		let result = await this.db.raw(query)
		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => +res.distance === 0 || +res.distance > 0 && +res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
		}
		result = this.returnByDatabaseType(result)
		// remove any duplicates
		const alertIds = []
		result = result.filter((alert) => {
			if (!alertIds.includes(alert.id)) {
				alertIds.push(alert.id)
				return alert
			}
		})
		return result
	}

	async handle(obj) {
		let pregenerateTile = false
		const data = obj
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.pokestop_id
			switch (this.config.geocoding.staticProvider.toLowerCase()) {
				case 'tileservercache': {
					pregenerateTile = true
					break
				}
				case 'google': {
					data.staticMap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${this.config.geocoding.type}&zoom=${this.config.geocoding.zoom}&size=${this.config.geocoding.width}x${this.config.geocoding.height}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'osm': {
					data.staticMap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${this.config.geocoding.width},${this.config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${this.config.geocoding.zoom}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'mapbox': {
					data.staticMap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${this.config.geocoding.zoom},0,0/${this.config.geocoding.width}x${this.config.geocoding.height}?access_token=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				default: {
					data.staticMap = ''
				}
			}

			data.googleMapUrl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			data.disappearTime = moment.tz(new Date(), this.config.locale.time, geoTz(data.latitude, data.longitude).toString()).endOf('day')
			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.disTime = data.disappearTime // deprecated
			data.tth = moment.preciseDiff(Date.now(), data.disappearTime.clone().utc(), true)
			data.imgUrl = ''
			data.stickerUrl = ''

			if (data.pokestop_name) {
				data.pokestop_name = this.escapeJsonString(data.pokestop_name)
				data.pokestopName = data.pokestop_name
			}
			if (data.pokestop_url) data.pokestopUrl = data.pokestop_url
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.debug(`${data.pokestop_id}: quest already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.questStringEng = await this.getQuest(data)
			data.rewardData = await this.getReward(data)
			// this.log.error('[DEBUG] Quest : data.questString: '+data.questString)
			// this.log.error('[DEBUG] Quest : data.rewardData: ', data.rewardData)
			data.dustAmount = data.rewardData.dustAmount
			data.isShiny = data.rewardData.isShiny
			data.itemAmount = data.rewardData.itemAmount
			data.monsters = data.rewardData.monsters
			data.monsterData = data.rewardData.monsterData
			data.items = data.rewardData.items
			data.energyAmount = data.rewardData.energyAmount
			data.energyMonsters = data.rewardData.energyMonsters

			data.matched = this.pointInArea([data.latitude, data.longitude])
			data.imgUrl = data.rewardData.monsters[1]
				? `${this.config.general.imgUrl}pokemon_icon_${data.monsterData.pokemonId.toString().padStart(3, '0')}_${data.monsterData.formId.toString().padStart(2, '0')}.png`
				: 'https://s3.amazonaws.com/com.cartodb.users-assets.production/production/jonmrich/assets/20150203194453red_pin.png'
			data.stickerUrl = data.rewardData.monsters[1]
				? `${this.config.general.stickerUrl}pokemon_icon_${data.monsterData.pokemonId.toString().padStart(3, '0')}_${data.monsterData.formId.toString().padStart(2, '0')}.webp`
				: ''

			if (data.rewardData.items[1]) {
				data.imgUrl = `${this.config.general.imgUrl}rewards/reward_${data.rewardData.items[1]}_1.png`
				data.stickerUrl = `${this.config.general.stickerUrl}rewards/reward_${data.rewardData.items[1]}_1.webp`
			}
			if (data.dustAmount) {
				data.imgUrl = `${this.config.general.imgUrl}rewards/reward_stardust.png`
				data.stickerUrl = `${this.config.general.stickerUrl}rewards/reward_${data.rewardData.items[1]}_1.webp`
			}
			if (data.energyAmount) {
				data.imgUrl = `${this.config.general.imgUrl}rewards/reward_mega_energy_${data.energyMonsters[1]}.png`
				data.stickerUrl = `${this.config.general.stickerUrl}rewards/reward_mega_energy_${data.energyMonsters[1]}.webp`
			}

			const whoCares = await this.questWhoCares(data)
			if (whoCares.length) {
				this.log.info(`${logReference}: Quest appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Quest appeared in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			}

			if (!whoCares[0]) return []

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating quest alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
				})

				return []
			}

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile && this.config.geocoding.staticMapType.quest) {
				data.staticMap = await this.tileserverPregen.getPregeneratedTileURL(logReference, 'quest', data, this.config.geocoding.staticMapType.quest)
			}

			if (data.monsters.length == 2) {
				data.baseStats = Object.values(this.GameData.monsters).some((mon) => data.monsterData.pokemonId == mon.id && data.monsterData.formId == mon.form.id) ? Object.values(this.GameData.monsters).filter((mon) => data.monsterData.pokemonId == mon.id && data.monsterData.formId == mon.form.id)[0].stats : ''
				if (!data.baseStats) data.baseStats = Object.values(this.GameData.monsters).some((mon) => data.monsterData.pokemonId == mon.id && !mon.form.id) ? Object.values(this.GameData.monsters).filter((mon) => data.monsterData.pokemonId == mon.id && !mon.form.id)[0].stats : ''
			}
			data.staticmap = data.staticMap // deprecated

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating quest alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating quest alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating quest alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				data.questString = translator.translate(data.questStringEng)
				data.monsterNames = Object.values(this.GameData.monsters).filter((mon) => data.monsters.includes(mon.id) && !mon.form.id).map((m) => translator.translate(m.name)).join(', ')
				data.monsterNamesEng = Object.values(this.GameData.monsters).filter((mon) => data.monsters.includes(mon.id) && !mon.form.id).map((m) => m.name).join(', ')
				data.itemNames = Object.keys(this.GameData.items).filter((item) => data.items.includes(item)).map((i) => translator.translate(this.GameData.items[i].name)).join(', ')
				data.itemNamesEng = Object.keys(this.GameData.items).filter((item) => data.items.includes(item)).map((i) => this.GameData.items[i].name).join(', ')
				data.energyMonstersNames = Object.values(this.GameData.monsters).filter((mon) => data.energyMonsters.includes(mon.id) && !mon.form.id).map((m) => translator.translate(m.name)).join(', ')
				data.energyMonstersNamesEng = Object.values(this.GameData.monsters).filter((mon) => data.energyMonsters.includes(mon.id) && !mon.form.id).map((m) => m.name).join(', ')
				data.rewardString = data.monsterNames
				data.rewardString = data.dustAmount > 0 ? `${data.dustAmount} ${translator.translate('Stardust')}` : data.rewardString
				data.rewardString = data.itemAmount > 0 ? `${data.itemAmount} ${data.itemNames}` : data.rewardString
				data.rewardString = data.energyAmount > 0 ? `${data.energyAmount} ${data.energyMonstersNames} ${translator.translate('Mega Energy')}` : data.rewardString
				data.rewardStringEng = data.monsterNamesEng
				data.rewardStringEng = data.dustAmount > 0 ? `${data.dustAmount} Stardust` : data.rewardStringEng
				data.rewardStringEng = data.itemAmount > 0 ? `${data.itemAmount} ${data.itemNamesEng}` : data.rewardStringEng
				data.rewardStringEng = data.energyAmount > 0 ? `${data.energyAmount} ${data.energyMonstersNamesEng} Mega Energy` : data.rewardStringEng

				const view = {
					...geoResult,
					...data,
					...data.rewardData,
					id: data.pokemon_id,
					lat: +data.latitude.toFixed(4),
					lon: +data.longitude.toFixed(4),
					time: data.disappearTime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					now: new Date(),
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}

				let [platform] = cares.type.split(':')
				if (platform == 'webhook') platform = 'discord'

				const mustache = this.getDts(logReference, 'quest', platform, cares.template, language)
				if (mustache) {
					let mustacheResult
					let message
					try {
						mustacheResult = mustache(view, { data: { language } })
					} catch (err) {
						this.log.error(`${logReference}: Error generating mustache results for ${platform}/${cares.template}/${language}`, err, view)
						// eslint-disable-next-line no-continue
						continue
					}
					mustacheResult = await this.urlShorten(mustacheResult)
					try {
						message = JSON.parse(mustacheResult)
					} catch (err) {
						this.log.error(`${logReference}: Error JSON parsing mustache results ${mustacheResult}`, err)
						// eslint-disable-next-line no-continue
						continue
					}

					if (cares.ping) {
						if (!message.content) {
							message.content = cares.ping
						} else {
							message.content += cares.ping
						}
					}

					const work = {
						lat: data.latitude.toString().substring(0, 8),
						lon: data.longitude.toString().substring(0, 8),
						message,
						target: cares.id,
						type: cares.type,
						name: cares.name,
						tth: data.tth,
						clean: cares.clean,
						logReference,
						language,
					}
					jobs.push(work)
				}
			}

			return jobs
		} catch (e) {
			this.log.error(`${data.pokestop_id}: Can't seem to handle quest: `, e, data)
		}
	}

	async getQuest(item) {
		// this.log.error('[DEBUG] Quest : item ', item)
		let str
		let tstr = ''
		let pstr = ''
		let gstr = ''
		let raidLevel
		if (item.quest_task && !this.config.general.ignoreMADQuestString) {
			str = item.quest_task
		} else {
			const questinfo = item.conditions[0] ? item.conditions[0].info : ''
			// this.log.error('[DEBUG] Quest : item[conditions]: ', item.conditions)
			// this.log.error('[DEBUG] Quest : questinfo: ', questinfo)
			const questStr = questTypeList[item.type]
			str = questStr.text
			if (item.conditions[0] && item.conditions[0].type > 0) {
				switch (item.conditions[0].type) {
					case 1:
						if (questinfo.pokemon_type_ids.length > 1) {
							let first = true
							for (const [index, typeId] of Object.entries(questinfo.pokemon_type_ids)) {
								if (first) {
									tstr += `${pokemonTypes[typeId]}`
								} else {
									tstr += (index == questinfo.pokemon_type_ids.length - 1) ? ` or ${pokemonTypes[typeId]}` : `, ${pokemonTypes[typeId]}`
								}
								first = false
							}
						} else {
							tstr += `${pokemonTypes[questinfo.pokemon_type_ids]}`
						}
						if (item.conditions[1] && item.conditions[1].type === 21) {
							str = str.replace('Catch {0}', 'Catch {0} different species of')
						}
						str = str.replace('pokémon', `${tstr}-type Pokémon`)
						str = str.replace('Snapshot(s)', `Snapshot(s) of ${tstr}-type Pokémon`)
						break
					case 2:
						if (questinfo.pokemon_ids.length > 1) {
							let first = true
							for (const [index, id] of Object.entries(questinfo.pokemon_ids)) {
								if (first) {
									pstr += `${this.GameData.monsters[`${id}_0`].name}`
								} else {
									pstr += (index == questinfo.pokemon_ids.length - 1) ? ` or ${this.GameData.monsters[`${id}_0`].name}` : `, ${this.GameData.monsters[`${id}_0`].name}`
								}
								first = false
							}
						} else {
							pstr += `${this.GameData.monsters[`${questinfo.pokemon_ids}_0`].name}`
						}
						str = str.replace('pokémon', pstr)
						str = str.replace('Snapshot(s)', `Snapshot(s) of ${pstr}`)
						break
					case 3:
						str = str.replace('pokémon', 'Pokémon with weather boost')
						break
					case 6:
						str = str.replace('Complete', 'Win')
						break
					case 7:
						raidLevel = Math.min.apply(null, questinfo.raid_levels)
						if (raidLevel > 1) {
							str = str.replace('raid battle(s)', `level ${raidLevel} or higher raid`)
						}
						if (item.conditions[1] && item.conditions[1].type === 6) {
							str = str.replace('Complete', 'Win')
						}
						break
					case 8:
						str = str.replace('Land', 'Make')
						str = str.replace('throw(s)', `${this.GameData.utilData.throwType[questinfo.throw_type_id]} Throw(s)`)
						if (item.conditions[1] && item.conditions[1].type === 15) {
							str = str.replace('Throw(s)', 'Curveball Throw(s)')
						}
						break
					case 9:
						str = str.replace('Complete', 'Win')
						break
					case 10:
						str = str.replace('Complete', 'Use a super effective charged attack in')
						break
					case 11:
						if (item.quest_type === 13) {
							str = str.replace('Catch', 'Use').replace('pokémon with berrie(s)', 'berrie(s) to help catch Pokémon')
						}
						if (questinfo !== null) {
						//												str = str.replace('berrie(s)', itemList[questinfo['item_id']].name)
						//												str = str.replace('Evolve {0} pokémon', 'Evolve {0} pokémon with a ' + itemList[questinfo['item_id']].name)
							str = str.replace('berrie(s)', this.GameData.items[questinfo.item_id].name)
							str = str.replace('Evolve {0} pokémon', `Evolve {0} pokémon with a ${this.GameData.items[questinfo.item_id].name}`)
						} else {
							str = str.replace('Evolve', 'Use a item to evolve')
						}
						break
					case 12:
						str = str.replace('pokéstop(s)', "pokéstop(s) you haven't visited before")
						break
					case 14:
						str = str.replace('Land', 'Make')
						if (typeof questinfo.throw_type_id === 'undefined') {
							str = str.replace('throw(s)', 'Throw(s) in a row')
						} else {
							str = str.replace('throw(s)', `${this.GameData.utilData.throwType[questinfo.throw_type_id]} Throw(s) in a row`)
						}
						if (item.conditions[1] && item.conditions[1].type === 15) {
							str = str.replace('Throw(s)', 'Curveball Throw(s)')
						}
						break
					case 22:
						str = str.replace('Win', 'Battle a Team Leader').replace('pvp battle(s)', 'times')
						break
					case 23:
						str = str.replace('Win', 'Battle Another Trainer').replace('pvp battle(s)', 'times')
						break
					case 25:
						str = str.replace('{0} pokémon', `pokémon caught ${questinfo.distance}km apart`)
						break
					case 27:
						if (questinfo.character_category_ids.length > 1) {
							let first = true
							for (const [index, charId] of Object.entries(questinfo.character_category_ids)) {
								if (first) {
									gstr += `${gruntCharacterTypes[charId]}`
								} else {
									gstr += (index == questinfo.character_category_ids.length - 1) ? ` or ${gruntCharacterTypes[charId]}` : `, ${gruntCharacterTypes[charId]}`
								}
								first = false
							}
						} else {
							gstr += `${gruntCharacterTypes[questinfo.character_category_ids]}`
						}
						str = str.replace('Team GO Rocket Grunt(s)', gstr)
						if (item.conditions[1] && item.conditions[1].type === 18) {
							str = str.replace('Battle against', 'Defeat')
						}
						break
					case 28:
						if (item.quest_type === 28) {
							str = str.replace('Snapshot(s)', 'Snapshot(s) of your Buddy')
						}
						break
					default:
				}
			} else if (item.type > 0) {
				switch (item.type) {
					case 7:
						str = str.replace('Complete', 'Battle in a gym').replace('gym battle(s)', 'times')
						break
					case 8:
						str = str.replace('Complete', 'Battle in a raid').replace('raid battle(s)', 'times')
						break
					case 13:
						str = str.replace('Catch', 'Use').replace('pokémon with berrie(s)', 'berries to help catch Pokémon')
						break
					case 17:
						str = str.replace('Walk your buddy to earn', 'Earn').replace('candy', 'candy walking with your buddy')
						break
					default:
				}
			}
			str = str.replace('{0}', item.target)
			if (item.target === 1) {
				str = str.replace('(s)', '').replace('1 ', 'a ').replace(' a times', '').replace('friends', 'friend')
			} else {
				str = str.replace('(s)', 's')
			}
			str = str.replace('pokémon', 'Pokémon')
		}
		str = str.replace('Pokemon', 'Pokémon')
		return str
	}

	// eslint-disable-next-line class-methods-use-this
	async getReward(item) {
		const monsters = [0]
		const monsterData = { pokemonId: 0, formId: 0 }
		const items = [0]
		let itemAmount = 0
		let dustAmount = 0
		let isShiny = 0
		let energyAmount = 0
		const energyMonsters = [0]

		item.rewards.forEach((reward) => {
			if (reward.type === 2) {
				items.push(reward.info.item_id.toString())
				itemAmount = reward.info.amount
			} else if (reward.type === 3) {
				dustAmount = reward.info.amount
			} else if (reward.type === 7) {
				if (reward.info.shiny) isShiny = 1
				monsters.push(reward.info.pokemon_id)
				monsterData.pokemonId = reward.info.pokemon_id
				monsterData.formId = reward.info.form_id
			} else if (reward.type === 12) {
				energyAmount = reward.info.amount
				energyMonsters.push(reward.info.pokemon_id)
			}
		})
		return {
			monsters, monsterData, items, itemAmount, dustAmount, isShiny, energyAmount, energyMonsters,
		}
	}
}

module.exports = Quest
