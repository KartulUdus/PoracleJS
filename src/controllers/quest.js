//
// Quest controller getReward and getQuest function inspired from PMSF
//
// ....because it is smartly done there!!

const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')
const { log } = require('../lib/logger')
const { questTypes } = require('../lib/GameData')

// const itemList = require('../util/quests/items')
const pokemonTypes = ['unset', 'Normal', 'Fighting', 'Flying', 'Poison', 'Ground', 'Rock', 'Bug', 'Ghost', 'Steel', 'Fire', 'Water', 'Grass', 'Electric', 'Psychic', 'Ice', 'Dragon', 'Dark', 'Fairy']
const gruntCharacterTypes = ['unset', 'Team Leader(s)', 'Team GO Rocket Grunt(s)', 'Arlo', 'Cliff', 'Sierra', 'Giovanni']

class Quest extends Controller {
	async questWhoCares(data) {
		const { areastring, strictareastring } = this.buildAreaString(data.matched)

		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, quest.distance, quest.clean, quest.ping, quest.template from quest
		join humans on (humans.id = quest.id and humans.current_profile_no = quest.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%quest%') 
		${strictareastring}
		and (0 = 1`

		if (data.rewardData.monsters.length) {
			for (const monster of data.rewardData.monsters) {
				if (monster.shiny) {
					query = query.concat(` or (reward_type=7 and reward = ${monster.pokemonId} and (form = 0 or form=${monster.formId}) and shiny = 1)`)
				}
				query = query.concat(` or (reward_type=7 and reward = ${monster.pokemonId} and (form = 0 or form=${monster.formId}) and shiny = 0)`)
			}
		}
		if (data.rewardData.items.length) {
			for (const item of data.rewardData.items) {
				query = query.concat(` or (reward_type = 2 and reward = ${item.id} and ${item.amount} >= amount  )`)
			}
		}
		if (data.rewardData.dustAmount > 0) {
			query = query.concat(` or (reward_type = 3 and reward <= ${data.rewardData.dustAmount})`)
		}
		if (data.rewardData.energyMonsters.length > 0) {
			for (const monster of data.rewardData.energyMonsters) {
				query = query.concat(` or (reward_type = 12 and (reward = ${monster.pokemonId} or reward = 0) and ${monster.amount} >= amount)`)
			}
		}
		if (data.rewardData.candy.length > 0) {
			for (const monster of data.rewardData.candy) {
				query = query.concat(` or (reward_type = 4 and (reward = ${monster.pokemonId} or reward = 0) and ${monster.amount} >= amount)`)
			}
		}
		query = query.concat(')')

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
		const data = obj
		const minTth = this.config.general.alertMinimumTime || 0

		try {
			const logReference = data.pokestop_id

			Object.assign(data, this.config.general.dtsDictionary)
			data.googleMapUrl = `https://maps.google.com/maps?q=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			if (this.config.general.rdmURL) {
				data.rdmUrl = `${this.config.general.rdmURL}${!this.config.general.rdmURL.endsWith('/') ? '/' : ''}@pokestop/${data.pokestop_id}`
			}
			if (this.config.general.reactMapURL) {
				data.reactMapUrl = `${this.config.general.reactMapURL}${!this.config.general.reactMapURL.endsWith('/') ? '/' : ''}id/pokestops/${data.pokestop_id}`
			}
			if (this.config.general.rocketMadURL) {
				data.rocketMadUrl = `${this.config.general.rocketMadURL}${!this.config.general.rocketMadURL.endsWith('/') ? '/' : ''}?lat=${data.latitude}&lon=${data.longitude}&zoom=18.0`
			}
			data.intersection = await this.obtainIntersection(data)
			data.disappearTime = moment.tz(new Date(), this.config.locale.time, geoTz.find(data.latitude, data.longitude)[0].toString()).endOf('day')
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
			data.pokestop_url = data.pokestop_url || this.config.fallbacks?.pokestopUrl
			data.pokestopUrl = data.pokestop_url

			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.debug(`${data.pokestop_id}: quest already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.questStringEng = await this.getQuest(data)
			data.rewardData = await this.getReward(logReference, data)
			this.log.debug(`${logReference} Quest: data.questString: ${data.questStringEng}, data.rewardData: ${JSON.stringify(data.rewardData)}`)
			data.dustAmount = data.rewardData.dustAmount
			data.isShiny = data.rewardData.monsters.length > 0 ? data.rewardData.monsters[0].shiny : 0
			data.shinyPossible = data.rewardData.monsters.length > 0 ? this.shinyPossible.isShinyPossible(data.rewardData.monsters[0].pokemonId, data.rewardData.monsters[0].formId) : false

			data.itemAmount = data.rewardData.itemAmount
			//			data.monsters = data.rewardData.monsters
			//			data.monsterData = data.rewardData.monsterData
			//			data.items = data.rewardData.items
			data.energyAmount = data.rewardData.energyMonsters.length > 0 ? data.rewardData.energyMonsters[0].amount : 0 // deprecated
			data.candyAmount = data.rewardData.candy.length > 0 ? data.rewardData.candy[0].amount : 0 // deprecated

			// data.energyMonsters = data.rewardData.energyMonsters.map((mon) => mon.pokemonId) // deprecated

			data.matchedAreas = this.pointInArea([data.latitude, data.longitude])
			data.matched = data.matchedAreas.map((x) => x.name.toLowerCase())

			const whoCares = data.poracleTest ? [{
				...data.poracleTest,
				clean: false,
				ping: '',
			}] : await this.questWhoCares(data)
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

			data.imgUrl = 'https://s3.amazonaws.com/com.cartodb.users-assets.production/production/jonmrich/assets/20150203194453red_pin.png'
			data.stickerUrl = ''

			if (data.rewardData.monsters.length > 0) {
				if (this.imgUicons) data.imgUrl = await this.imgUicons.pokemonIcon(data.rewardData.monsters[0].pokemonId, data.rewardData.monsters[0].formId, 0, 0, 0, 0, data.isShiny || (data.shinyPossible && this.config.general.requestShinyImages))
				if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.pokemonIcon(data.rewardData.monsters[0].pokemonId, data.rewardData.monsters[0].formId, 0, 0, 0, 0, data.isShiny || (data.shinyPossible && this.config.general.requestShinyImages))
				if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.pokemonIcon(data.rewardData.monsters[0].pokemonId, data.rewardData.monsters[0].formId, 0, 0, 0, 0, data.isShiny || (data.shinyPossible && this.config.general.requestShinyImages))
			}

			if (data.rewardData.items.length > 0) {
				if (this.imgUicons) data.imgUrl = await this.imgUicons.rewardItemIcon(data.rewardData.items[0].id, data.rewardData.items[0].amount)
				if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.rewardItemIcon(data.rewardData.items[0].id, data.rewardData.items[0].amount)
				if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.rewardItemIcon(data.rewardData.items[0].id, data.rewardData.items[0].amount)
			}
			if (data.dustAmount) {
				if (this.imgUicons) data.imgUrl = await this.imgUicons.rewardStardustIcon(data.rewardData.dustAmount)
				if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.rewardStardustIcon(data.rewardData.dustAmount)
				if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.rewardStardustIcon(data.rewardData.dustAmount)
			}
			if (data.rewardData.energyMonsters.length > 0) {
				if (this.imgUicons) data.imgUrl = await this.imgUicons.rewardMegaEnergyIcon(data.rewardData.energyMonsters[0].pokemonId, data.rewardData.energyMonsters[0].amount)
				if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.rewardMegaEnergyIcon(data.rewardData.energyMonsters[0].pokemonId, data.rewardData.energyMonsters[0].amount)
				if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.rewardMegaEnergyIcon(data.rewardData.energyMonsters[0].pokemonId, data.rewardData.energyMonsters[0].amount)
			}
			if (data.rewardData.candy.length > 0) {
				if (this.imgUicons) data.imgUrl = await this.imgUicons.rewardCandyIcon(data.rewardData.candy[0].pokemonId, data.rewardData.candy[0].amount)
				if (this.imgUiconsAlt) data.imgUrlAlt = await this.imgUiconsAlt.rewardCandyIcon(data.rewardData.candy[0].pokemonId, data.rewardData.candy[0].amount)
				if (this.stickerUicons) data.stickerUrl = await this.stickerUicons.rewardCandyIcon(data.rewardData.candy[0].pokemonId, data.rewardData.candy[0].amount)
			}

			data.imgUrl = data.imgUrl || this.config.fallbacks?.imgUrlPokestop
			data.imgUrlAlt = data.imgUrlAlt || this.config.fallbacks?.imgUrlPokestop

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			await this.getStaticMapUrl(logReference, data, 'quest', ['latitude', 'longitude', 'imgUrl'])
			data.staticmap = data.staticMap // deprecated

			if (data.rewardData.monsters.length > 0) {
				data.baseStats = Object.values(this.GameData.monsters).some((mon) => data.rewardData.monsters[0].pokemonId === mon.id && data.rewardData.monsters[0].formId === mon.form.id) ? Object.values(this.GameData.monsters).filter((mon) => data.rewardData.monsters[0].pokemonId === mon.id && data.rewardData.monsters[0].formId === mon.form.id)[0].stats : ''
				if (!data.baseStats) data.baseStats = Object.values(this.GameData.monsters).some((mon) => data.rewardData.monsters[0].pokemonId === mon.id && !mon.form.id) ? Object.values(this.GameData.monsters).filter((mon) => data.rewardData.monsters[0].pokemonId === mon.id && !mon.form.id)[0].stats : ''
			}

			const event = this.eventParser.eventChangesQuest(moment().unix(), data.disappearTime.unix(), data.latitude, data.longitude)
			if (event) {
				data.futureEvent = true
				data.futureEventTime = event.time
				data.futureEventName = event.name
				data.futureEventTrigger = event.reason
			}

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
				let [platform] = cares.type.split(':')
				if (platform === 'webhook') platform = 'discord'

				data.questString = translator.translate(data.questStringEng)

				for (const monster of data.rewardData.monsters) {
					let monsterName
					let formName

					const mon = Object.values(this.GameData.monsters).find((m) => m.id === monster.pokemonId && m.form.id === monster.formId)
					if (!mon) {
						monsterName = `${translator.translate('Unknown monster')} ${monster.pokemonId}`
						formName = `${monster.formId}`
					} else {
						monsterName = mon.name
						formName = mon.form.name
						if (formName === undefined || formName === 'Normal') formName = ''
					}

					monster.nameEng = monsterName
					monster.formEng = formName
					monster.name = translator.translate(monsterName)
					monster.form = translator.translate(formName)
					monster.fullNameEng = monster.nameEng.concat(monster.formEng ? ' ' : '', monster.formEng)
					monster.fullName = monster.name.concat(monster.form ? ' ' : '', monster.form)
				}

				data.monsterNames = data.rewardData.monsters.map((mon) => mon.fullName).join(', ')
				data.monsterNamesEng = data.rewardData.monsters.map((mon) => mon.fullNameEng).join(', ')

				for (const item of data.rewardData.items) {
					const i = this.GameData.items[item.id]
					let itemName
					if (!i) {
						itemName = `${translator.translate('Unknown item')} ${item.id}`
					} else {
						itemName = i.name
					}
					item.nameEng = itemName
					item.name = translator.translate(itemName)
				}

				data.itemNames = data.rewardData.items.map((item) => `${item.amount} ${item.name}`).join(', ')
				data.itemNamesEng = data.rewardData.items.map((item) => `${item.amount} ${item.nameEng}`).join(', ')

				for (const monster of data.rewardData.energyMonsters) {
					let monsterName

					const mon = Object.values(this.GameData.monsters).find((m) => m.id === monster.pokemonId && !m.form.id)
					if (!mon) {
						monsterName = `${translator.translate('Unknown monster')} ${monster.pokemonId}`
					} else {
						monsterName = mon.name
					}

					monster.nameEng = monsterName
					monster.name = translator.translate(monsterName)
				}

				data.energyMonstersNames = data.rewardData.energyMonsters.map((item) => `${item.amount} ${item.name} ${translator.translate('Mega Energy')}`).join(', ')
				data.energyMonstersNamesEng = data.rewardData.energyMonsters.map((item) => `${item.amount} ${item.nameEng} Mega Energy`).join(', ')

				for (const monster of data.rewardData.candy) {
					let monsterName

					const mon = Object.values(this.GameData.monsters).find((m) => m.id === monster.pokemonId && !m.form.id)
					if (!mon) {
						monsterName = `${translator.translate('Unknown monster')} ${monster.pokemonId}`
					} else {
						monsterName = mon.name
					}

					monster.nameEng = monsterName
					monster.name = translator.translate(monsterName)
				}

				data.candyMonstersNames = data.rewardData.candy.map((item) => `${item.amount} ${item.name}  ${translator.translate('Candy')}`).join(', ')
				data.candyMonstersNamesEng = data.rewardData.candy.map((item) => `${item.amount} ${item.nameEng} Candy`).join(', ')

				data.rewardString = [
					data.monsterNames,
					data.dustAmount > 0 ? `${data.dustAmount} ${translator.translate('Stardust')}` : '',
					data.itemNames,
					data.energyMonstersNames,
					data.candyMonstersNames,
				].filter((x) => x).join(', ')

				data.rewardStringEng = [
					data.monsterNamesEng,
					data.dustAmount > 0 ? `${data.dustAmount} Stardust` : '',
					data.itemNamesEng,
					data.energyMonstersNamesEng,
					data.candyMonstersNamesEng,
				].filter((x) => x).join(', ')

				data.shinyPossibleEmoji = data.shinyPossible ? translator.translate(this.emojiLookup.lookup('shiny', platform)) : ''

				const view = {
					...geoResult,
					...data,
					...data.rewardData,
					lat: +data.latitude.toFixed(4),
					lon: +data.longitude.toFixed(4),
					time: data.disappearTime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					now: new Date(),
					nowISO: new Date().toISOString(),
					areas: data.matchedAreas.filter((area) => area.displayInMatches).map((area) => area.name).join(', '),
				}

				const templateType = 'quest'
				const message = await this.createMessage(logReference, templateType, platform, cares.template, language, cares.ping, view)

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
			const questStr = questTypes[item.type]
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
									tstr += (index === questinfo.pokemon_type_ids.length - 1) ? ` or ${pokemonTypes[typeId]}` : `, ${pokemonTypes[typeId]}`
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
									pstr += (index === questinfo.pokemon_ids.length - 1) ? ` or ${this.GameData.monsters[`${id}_0`].name}` : `, ${this.GameData.monsters[`${id}_0`].name}`
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
									gstr += (index === questinfo.character_category_ids.length - 1) ? ` or ${gruntCharacterTypes[charId]}` : `, ${gruntCharacterTypes[charId]}`
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
	async getReward(logReference, item) {
		const monsters = []
		const items = []
		let dustAmount = 0
		const energyMonsters = []
		const candy = []

		item.rewards.forEach((reward) => {
			if (reward.type === 2) {
				items.push({
					id: reward.info.item_id.toString(),
					amount: reward.info.amount,
				})
			} else if (reward.type === 3) {
				dustAmount = reward.info.amount
			} else if (reward.type === 4) {
				candy.push({
					pokemonId: reward.info.pokemon_id,
					amount: reward.info.amount,
				})
			} else if (reward.type === 7) {
				monsters.push({
					pokemonId: reward.info.pokemon_id,
					formId: reward.info.form_id ?? 0,
					shiny: reward.info.shiny ?? false,
				})
			} else if (reward.type === 12) {
				energyMonsters.push({
					pokemonId: reward.info.pokemon_id,
					amount: reward.info.amount,
				})
			}
		})
		return {
			items, dustAmount, energyMonsters, candy, monsters,
		}
	}
}

module.exports = Quest
