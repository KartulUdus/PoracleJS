const Controller = require('./controller')

const config = require('config')
const log = require('../logger');

const mustache = require('mustache');
const dts = require('../../../config/questdts')
const messageDts = require('../../../config/dts')

const monsterData = require(config.locale.monstersJson)
const weatherData = require('../util/weather')
const typeData = require('../util/types')
const _ = require('lodash')


class Quest extends Controller{

/*
* monsterWhoCares, takes data object
*/
	async questWhoCares(data) {
		return new Promise(resolve => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `);
			});
			const query = `
			select * from quest
            join humans on humans.id = quest.id
            where humans.enabled = 1 and
            ((reward in (${data.rewardData.monsters}) and reward_type=7 ) or (reward_type = 2 and reward in (${data.rewardData.items})) or (reward_type = 3 and reward=0)) 
            and
            (round( 6371000 * acos( cos( radians(${data.latitude}) )
              * cos( radians( humans.latitude ) )
              * cos( radians( humans.longitude ) - radians(${data.longitude}) )
              + sin( radians(${data.latitude}) )
              * sin( radians( humans.latitude ) ) ) < quest.distance and quest.distance != 0) or
               quest.distance = 0 and (${areastring}))
			group by humans.id`;


			log.debug(`Query constructed for questWhoCares: \n ${query}`)
			this.db.query(query)
				.then(
					function(result){
						log.info(`Quest ${data.questType} reported and ${result[0].length} humans cared`);
						resolve(result[0])
					}
				)
				.catch((err) => {log.error(`questWhoCares errored with: ${err}`)})
		})
	}

	async handle(data) {
		return new Promise(resolve => {

			Promise.all([
				this.getQuestTypeString(data),
				this.getRewardSting(data),
				this.getConditionString(data),
				this.pointInArea([data.latitude, data.longitude])
				]).then(questData => {
					data['questType']= questData[0]
					data['rewardData'] = questData[1]
					data['conditionstring'] = questData[2]
					data['matched']  = questData[3]
					let jobs = []
					let monsternames = []
					let itemnames = []
					data.rewardData.monsters.forEach(m => {
						if(m) monsternames.push(monsterData[m].name)
					})
					data.rewardData.items.forEach(i => {
						if (i) itemnames.push(dts.rewardItems[i])
					})
					data['imgurl'] = data.rewardData.monsters[1]?
						`${config.general.imgurl}pokemon_icon_${data.rewardData.monsters[1].toString().padStart(3, '0')}_00.png`
						: 'saflkansd'
					if(data.rewardData.items[1]){
						data['imgurl'] = `${config.general.imgurl}/rewards/reward_${data.rewardData.items[1]}_1.png`
					}
					if(data.type === 3){
						data['imgurl'] = `${config.general.imgurl}/rewards/reward_stardust.png`
					}

					this.questWhoCares(data).then(whoCares => {
						if(whoCares) this.getAddress({ lat: data.latitude, lon: data.longitude }).then(geoResult => {
							const view = {
								guestType: data.questType,
								reward: data.rewardData.rewardstring.replace(/\n/g, " "),
								conditions: data.conditionstring.replace(/\n/g, " "),
								monsterNames: monsternames.join(', '),
								itemNames: itemnames.join(', '),
								imgurl: data.imgurl.toLowerCase(),
								name: data.pokestop_name.replace(/\n/g, " "),
								url: data.pokestop_url,
								minCp: data.rewardData.monsters[1]? this.getCp(data.rewardData.monsters[1], 15, 10, 10, 10) : '',
								maxCp: data.rewardData.monsters[1]? this.getCp(data.rewardData.monsters[1], 15, 15, 15, 15) : '',
								mapurl: `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`,
								applemap: `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`,

								// geocode stuff
								lat: data.latitude.toString().substring(0, 8),
								lon: data.longitude.toString().substring(0, 8),
								addr: geoResult.addr,
								streetNumber: geoResult.streetNumber,
								streetName: geoResult.streetName,
								zipcode: geoResult.zipcode,
								country: geoResult.country,
								countryCode: geoResult.countryCode,
								city: geoResult.city,
								state: geoResult.state,
								stateCode: geoResult.stateCode,
								flagemoji: geoResult.flag
							};

							whoCares.forEach(cares => {
								const template = JSON.stringify(messageDts.quest[cares.template])
								let message = mustache.render(template, view)
								let work = {
									message: JSON.parse(message),
									target: cares.id,
									name: cares.name,
									emoji: []
								}
								jobs.push(work)
							})
							resolve(jobs)
						})
					})
				})
		})
	}

	async getQuestTypeString(data) {
		return new Promise(resolve => {
			let template = dts.questTypes[data.type]
			let quest = mustache.render(template, { amount: data.target})
			resolve(quest)
		})
	}

	async getRewardSting(data) {
		return new Promise(resolve => {

			let monsters = [0]
			let items = [0]
			let rewardString = ''


			data.rewards.forEach(async (reward) =>{
						if (reward.type === 2){
						let template = dts.questRewardTypes['2']
						let rew = mustache.render(template, {amount: reward.info.amount, item: dts.rewardItems[reward.info.item_id]})
						items.push(reward.info.item_id)
						rewardString = rewardString.concat(rew)
						}
					else if (reward.type === 3) {
						let template = dts.questRewardTypes['3']
						let rew = mustache.render(template, {amount: reward.info.amount})
						rewardString = rewardString.concat(rew)

					}
					else if (reward.type ===7) {
						let template = dts.questRewardTypes['7']
						let rew = mustache.render(template, {pokemon: monsterData[reward.info.pokemon_id].name})
						monsters.push(reward.info.pokemon_id)
						rewardString = rewardString.concat(rew)
					}
			})
			resolve({rewardstring: rewardString, monsters: monsters, items: items})
		})
	}


	async getConditionString(data) {
		return new Promise(resolve => {
			let conditionString = ''
			data.conditions.forEach(condition => {
				switch(condition.type){
					case 1 : {
						let typestring = ''
						condition.info.pokemon_type_ids.forEach(typeId => {
							let typename = _.findKey(typeData, function(o) { return o.id === typeId })
							let template = dts.questMonsterTypeString
							let monsterType = mustache.render(template, { name: typename, emoji: typeData[typename].emoji })
							typestring = typestring.concat(monsterType)
						})
						let template = dts.questConditions['1']
						let cond = mustache.render(template, {types: typestring})
						conditionString = conditionString.concat(cond)
						break
					}
					case 2 : {
						let pokemons = []
						condition.info.pokemon_ids.forEach(pokemonId => {
							pokemons.push(monsterData[pokemonId].name)
						})
						let template = dts.questConditions['2']
						let cond = mustache.render(template, {monsters: pokemons.join(', ')})
						conditionString = conditionString.concat(cond)
						break
					}
					case 3 : {
						let cond = dts.questConditions['3']
						conditionString = conditionString.concat(cond)
						break
					}
					case 6 : {
						let cond = dts.questConditions['6']
						conditionString = conditionString.concat(cond)
						break
					}
					case 7 : {
						let template = dts.questConditions['7']
						let cond = mustache.render(template, {levels: condition.info.raid_levels.join(', ')})
						conditionString = conditionString.concat(cond)
						break
					}
					case 8 : {
						let template = dts.questConditions['8']
						let cond = mustache.render(template, {throw_type: dts.throwType[condition.info.throw_type_id]})
						conditionString = conditionString.concat(cond)
						break
					}
					case 9 : {
						let cond = dts.questConditions['9']
						conditionString = conditionString.concat(cond)
						break
					}
					case 10 : {
						let cond = dts.questConditions['10']
						conditionString = conditionString.concat(cond)
						break
					}
					case 11 : {
						let cond = dts.questConditions['11']
						conditionString = conditionString.concat(cond)
						break
					}
					case 14 : {
						let template = dts.questConditions['14']
						let cond = mustache.render(template, { throw_type: dts.throwType[condition.info.throw_type_id], amount: data.target })
						conditionString = conditionString.concat(cond)
						break
					}
					case 15 : {
						let cond = dts.questConditions['15']
						conditionString = conditionString.concat(cond)
						break
					}
				}
			})
			resolve(conditionString)
		})
	}

}

module.exports = Quest