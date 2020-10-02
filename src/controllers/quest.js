// const pokemonGif = require('pokemon-gif')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')
const { log } = require('../lib/logger')

class Quest extends Controller {
	async questWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, quest.distance, quest.clean, quest.ping, quest.template from quest
		join humans on humans.id = quest.id
		where humans.enabled = 1 and
		((reward_type=7 and reward in (${data.rewardData.monsters}) and shiny = 1 and ${data.isShiny}=1 or reward_type=7 and reward in (${data.rewardData.monsters}) and shiny = 0)
		or (reward_type = 2 and reward in (${data.rewardData.items}))
		or (reward_type = 3 and reward <= ${data.dustAmount})
		or (reward_type = 12 and reward <= ${data.energyAmount}))
`

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			and
			(round( 6371000 * acos( cos( radians(${data.latitude}) )
			  * cos( radians( humans.latitude ) )
			  * cos( radians( humans.longitude ) - radians(${data.longitude}) )
			  + sin( radians(${data.latitude}) )
			  * sin( radians( humans.latitude ) ) ) < quest.distance and quest.distance != 0) or
			   quest.distance = 0 and (${areastring}))
			group by humans.id, humans.name, quest.template`)
		} else {
			query = query.concat(`
				and (quest.distance = 0 and (${areastring}) or quest.distance > 0)
				group by humans.id, humans.name, quest.template 
			`)
		}

		let result = await this.db.raw(query)
		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => res.distance === 0 || res.distance > 0 && res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
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
			switch (this.config.geocoding.staticProvider.toLowerCase()) {
				case 'poracle': {
					data.staticmap = `https://tiles.poracle.world/static/${this.config.geocoding.type}/${+data.latitude.toFixed(5)}/${+data.longitude.toFixed(5)}/${this.config.geocoding.zoom}/${this.config.geocoding.width}/${this.config.geocoding.height}/${this.config.geocoding.scale}/png`
					break
				}
				case 'tileservercache': {
					pregenerateTile = true
					break
				}
				case 'google': {
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${this.config.geocoding.type}&zoom=${this.config.geocoding.zoom}&size=${this.config.geocoding.width}x${this.config.geocoding.height}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'osm': {
					data.staticmap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${this.config.geocoding.width},${this.config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${this.config.geocoding.zoom}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'mapbox': {
					data.staticmap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${this.config.geocoding.zoom},0,0/${this.config.geocoding.width}x${this.config.geocoding.height}?access_token=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				default: {
					data.staticmap = ''
				}
			}

			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.disTime = moment.tz(new Date(), this.config.locale.time, geoTz(data.latitude, data.longitude).toString()).endOf('day')
			data.tth = moment.preciseDiff(Date.now(), data.disTime.clone().utc(), true)
			data.imgUrl = `${this.config.general.imgUrl}egg${data.level}.png`
			if (!data.team_id) data.team_id = 0
			if (data.name) data.gymName = data.name
			data.teamname = data.team_id ? this.utilData.teams[data.team_id].name : 'Harmony'
			data.color = data.team_id ? this.utilData.teams[data.team_id].color : 7915600

			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.debug(`quest ${data.name} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.questType = await this.getQuestTypeString(data)
			data.rewardData = await this.getRewardSting(data)
			data.conditionString = await this.getConditionString(data)
			data.matched = await this.pointInArea([data.latitude, data.longitude])
			data.dustAmount = data.rewardData.dustAmount
			data.isShiny = data.rewardData.isShiny
			data.energyAmount = data.rewardData.energyAmount
			data.monsterNames = Object.values(this.monsterData).filter((mon) => data.rewardData.monsters.includes(mon.id) && !mon.form.id).map((m) => this.translator.translate(m.name)).join(', ')
			data.itemNames = Object.keys(this.utilData.items).filter((item) => data.rewardData.items.includes(this.utilData.items[item])).map((i) => this.translator.translate(this.utilData.items[i])).join(', ')

			data.imgUrl = data.rewardData.monsters[1]
				? `${this.config.general.imgUrl}pokemon_icon_${data.rewardData.monsters[1].toString().padStart(3, '0')}_00.png`
				: 'https://s3.amazonaws.com/com.cartodb.users-assets.production/production/jonmrich/assets/20150203194453red_pin.png'

			if (data.rewardData.items[1]) {
				data.imgUrl = `${this.config.general.imgUrl}rewards/reward_${data.rewardData.items[1]}_1.png`
			}
			if (data.dustAmount) {
				data.imgUrl = `${this.config.general.imgUrl}rewards/reward_stardust.png`
				data.dustAmount = data.rewards[0].info.amount
			}
			if (data.energyAmount) {
				data.imgurl = `${this.config.general.imgUrl}rewards/reward_mega_energy.png`
				data.energyAmount = data.rewards[0].info.amount
			}
			data.staticSprite = encodeURI(JSON.stringify([
				{
					url: data.imgUrl,
					height: this.config.geocoding.spriteHeight,
					width: this.config.geocoding.spriteWidth,
					x_offset: 0,
					y_offset: 0,
					latitude: +data.latitude.toFixed(5),
					longitude: +data.longitude.toFixed(5),
				},
			]))
			if (this.config.geocoding.staticProvider === 'poracle') {
				data.staticmap = `${data.staticmap}?markers=${data.staticSprite}`
			}

			const whoCares = await this.questWhoCares(data)


			if (!whoCares[0]) return []

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				const { count } = this.getDiscordCache(cares.id)
				if (count <= this.config.discord.limitAmount + 1) discordCacheBad = false // but if anyone cares and has not exceeded cache, go on
			})

			if (discordCacheBad) return []

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile) {
				data.staticmap = await this.tileserverPregen.getPregeneratedTileURL('quest', data)
			}

			for (const cares of whoCares) {
				const caresCache = this.getDiscordCache(cares.id).count
				const view = {
					...geoResult,
					...data,
					...data.rewardData,
					id: data.pokemon_id,
					lat: +data.latitude.toFixed(4),
					lon: +data.longitude.toFixed(4),
					time: data.distime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					now: new Date(),
					genderData: this.utilData.genders[data.gender],
					// pokemoji: emojiData.pokemon[data.pokemon_id],
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}
				let questDts = this.dts.find((template) => template.type === 'quest' && template.id === cares.template && template.platform === 'discord')
				if (!questDts) questDts = this.dts.find((template) => template.type === 'quest' && template.default && template.platform === 'discord')
				const template = JSON.stringify(questDts.template)
				const mustache = this.mustache.compile(this.translator.translate(template))
				const message = JSON.parse(mustache(view))

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
					message: caresCache === this.config.discord.limitAmount + 1 ? { content: `You have reached the limit of ${this.config.discord.limitAmount} messages over ${this.config.discord.limitSec} seconds` } : message,
					target: cares.id,
					type: cares.type,
					name: cares.name,
					tth: data.tth,
					clean: cares.clean,
				}
				if (caresCache <= this.config.discord.limitAmount + 1) {
					jobs.push(work)
					this.addDiscordCache(cares.id)
				}
			}

			return jobs
		} catch (e) {
			this.log.error('Can\'t seem to handle quest: ', e, data)
		}
	}

	async getQuestTypeString(data) {
		return new Promise((resolve) => {
			const template = this.translator.translate(this.utilData.questTypes[data.type])
			const mustache = this.mustache.compile(this.translator.translate(template))
			const quest = mustache({ amount: data.target })
			resolve(quest)
		})
	}

	async getRewardSting(data) {
		return new Promise((resolve) => {
			const monsters = [0]
			const items = [0]
			let rewardString = ''
			let dustAmount = 0
			let isShiny = 0
			let energyAmount = 0

			data.rewards.forEach((reward) => {
				if (reward.type === 2) {
					const template = this.utilData.questRewardTypes[2]
					const mustache = this.mustache.compile(this.translator.translate(template))
					const rew = mustache({ amount: reward.info.amount, item: this.translator.translate(this.utilData.items[reward.info.item_id] || 'unknown item') })
					items.push(reward.info.item_id)
					rewardString = rewardString.concat(rew)
				} else if (reward.type === 3) {
					const template = this.utilData.questRewardTypes[3]
					const mustache = this.mustache.compile(this.translator.translate(template))
					const rew = mustache({ amount: reward.info.amount })
					dustAmount = reward.info.amount
					rewardString = rewardString.concat(rew)
				} else if (reward.type === 7) {
					const template = this.utilData.questRewardTypes[7]

					const monster = Object.values(this.monsterData).find((mon) => mon.id === reward.info.pokemon_id && mon.form.id === 0)
					const emoji = monster.types.map((t) => this.translator.translate(t.emoji)).join('')

					if (reward.info.shiny) isShiny = 1
					const mustache = this.mustache.compile(this.translator.translate(template))

					const rew = mustache({ pokemon: this.translator.translate(monster.name), emoji, isShiny })
					monsters.push(reward.info.pokemon_id)
					rewardString = rewardString.concat(rew)
				} else if (reward.type === 12) {
					const template = this.utilData.questRewardTypes['12']
					const monster = Object.values(this.monsterData).find((mon) => mon.id === reward.info.pokemon_id && mon.form.id === 0)		
					const mustache = this.mustache.compile(this.translator.translate(template))
					const rew = mustache({ pokemon: this.translator.translate(monster.name), amount: reward.info.amount })
					energyAmount = reward.info.amount
					rewardString = rewardString.concat(rew)
				}
			})
			resolve({
				rewardString, monsters, items, dustAmount, isShiny, energyAmount,
			})
		})
	}


	async getConditionString(data) {
		return new Promise((resolve) => {
			let conditionString = ''
			data.conditions.forEach((condition) => {
				switch (condition.type) {
					case 1: {
						let typestring = ''
						condition.info.pokemon_type_ids.forEach((typeId) => {
							const type = Object.keys(this.utilData.types).find((key) => this.utilData.types[key].id === typeId)
							const typename = type ? type.name : this.translator.translate('errorType')
							const template = this.utilData.questMonsterTypeString
							const mustache = this.mustache.compile(this.translator.translate(template))
							const monsterType = mustache({ name: this.translator.translate(typename), emoji: this.translator.translate(type.emoji) })
							typestring = typestring.concat(monsterType)
						})
						const template = this.translator.translate(this.utilData.questConditions[1])
						const mustache = this.mustache.compile(this.translator.translate(template))
						const cond = mustache({ types: typestring })
						conditionString = conditionString.concat(cond)
						break
					}
					case 2: {
						const monsters = Object.values(this.monsterData).filter((m) => condition.info.pokemon_ids.includes(m.id)).map((mon) => this.translator.translate(mon.name)).join(', ')

						const template = this.translator.translate(this.utilData.questConditions[2])
						const mustache = this.mustache.compile(this.translator.translate(template))
						const cond = mustache({ monsters })
						conditionString = conditionString.concat(cond)
						break
					}
					case 3: {
						const cond = this.translator.translate(this.utilData.questConditions[3])
						conditionString = conditionString.concat(cond)
						break
					}
					case 6: {
						const cond = this.translator.translate(this.utilData.questConditions[6])
						conditionString = conditionString.concat(cond)
						break
					}
					case 7: {
						const template = this.translator.translate(this.utilData.questConditions[7])
						const mustache = this.mustache.compile(this.translator.translate(template))
						const cond = mustache({ levels: condition.info.raid_levels.join(', ') })
						conditionString = conditionString.concat(cond)
						break
					}
					case 8: {
						const template = this.translator.translate(this.utilData.questConditions[8])
						const mustache = this.mustache.compile(this.translator.translate(template))
						const cond = mustache({ throw_type: this.translator.translate(this.utilData.throwType[condition.info.throw_type_id]) })
						conditionString = conditionString.concat(cond)
						break
					}
					case 9: {
						const cond = this.translator.translate(this.utilData.questConditions[9])
						conditionString = conditionString.concat(cond)
						break
					}
					case 10: {
						const cond = this.translator.translate(this.utilData.questConditions[10])
						conditionString = conditionString.concat(cond)
						break
					}
					case 11: {
						const template = this.translator.translate(this.utilData.questConditions[11])
						const item = condition.info ? this.translator.translate(this.utilData.items[condition.info.item_id]) : ''
						const mustache = this.mustache.compile(this.translator.translate(template))
						const cond = mustache({ item })
						conditionString = conditionString.concat(cond)
						break
					}
					case 14: {
						const template = this.translator.translate(this.utilData.questConditions[14])
						const mustache = this.mustache.compile(this.translator.translate(template))
						const cond = mustache({ throw_type: this.translator.translate(this.utilData.throwType[condition.info.throw_type_id]), amount: data.target })
						conditionString = conditionString.concat(cond)
						break
					}
					case 15: {
						const cond = this.translator.translate(this.utilData.questConditions[15])
						conditionString = conditionString.concat(cond)
						break
					}
					default:
				}
			})
			resolve(conditionString)
		})
	}
}


module.exports = Quest
