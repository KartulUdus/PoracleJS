const log = require('../logger')
const fs = require('fs')
const _ = require('lodash')
const config = require('config')
const Jimp = require('jimp')
const path = require('path')
const Controller = require('./controller')
const questIdentifierRegex = new RegExp('([,"\'”}{\]\[])', 'gi')

class RawData extends Controller {

/*
* monsterWhoCares, takes data object
*/

	async getStartPos(locationSting) {
		return new Promise((resolve) => {
			if (locationSting.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/)) {
				resolve(locationSting)
			}
			else {
				this.geolocate(locationSting).then((loc) => {
					resolve(`${loc[0].latitude}, ${loc[0].longitude}`)
				})
			}
		})

	}

	async getLiveMonsters(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			this.db.query('SELECT * from pokemon where latitude between ? and ? and longitude between ? and ? and disappear_time > UTC_TIMESTAMP()', [lat1, lat2, lon1, lon2])
				.then((result) => {
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`getLiveMonsters errored with: ${err}`)
				})
		})
	}

	async getLiveRaids(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			this.db.query('SELECT * from activeRaid where latitude between ? and ? and longitude between ? and ? and end > UTC_TIMESTAMP()', [lat1, lat2, lon1, lon2])
				.then((result) => {
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`getLiveRaids errored with: ${err}`)
				})
		})
	}


	async getGyms(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			this.db.query('SELECT * from `gym-info` where latitude between ? and ? and longitude between ? and ?', [lat1, lat2, lon1, lon2])
				.then((result) => {
					resolve(result[0])
				})
				.catch((err) => {
					log.error(`getGyms errored with: ${err}`)
				})
		})
	}

	async getLiveQuests(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			this.db.query('SELECT * from activeQuest where latitude between ? and ? and longitude between ? and ? and end_timestamp > UTC_TIMESTAMP()', [lat1, lat2, lon1, lon2])
				.then((result) => {
					let encodedResult=[]
					result[0].forEach((quest) => {
						quest.identifier = quest.rewards.replace(/[,"':”}{\]\[]/g, '')
						quest.rewards = JSON.parse(quest.rewards)
						quest.conditions = JSON.parse(quest.conditions)
						encodedResult.push(quest)
					})
					resolve(encodedResult)
				})
				.catch((err) => {
					log.error(`getLiveQuests errored with: ${err}`)
				})
		})
	}
	async checkRaidSprites(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			const query = `
				select concat('raid',pokemon_id,'level', raid_level,'t', team,'ex', is_exclusive) as identifier,  pokemon_id, raid_level, team, is_exclusive from activeRaid where 
				latitude between ? and ? and
				longitude between ? and ?
				group by identifier, pokemon_id, raid_level, team, is_exclusive;`
			this.db.query(query, [lat1, lat2, lon1, lon2])
				.then((result) => {
					const spritePromises = []
					_.forEach(result[0], (sprite) => {
						if (!fs.existsSync(path.join(this.imgPath, `/raid/${sprite.identifier}.png`))) {
							log.debug(`Sprite for ${sprite.identifier} not found, generating from ${path.join(__dirname, `../../../assets/${config.map.spriteDir}`)}`)
							spritePromises.push(this.raidImageCreator(sprite))
						}
					})
					Promise.all(spritePromises)
						.then(() => {
							resolve()
						})
						.catch((err) => {
							log.error(`checkRaidSprites DB call errored with: ${err}`)
						})

				})
		})
	}

	async checkGymSprites(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			const query = `
				select concat('gym',team,'ex', park) as identifier, team, park from \`gym-info\`  where 
				latitude between ? and ? and
				longitude between ? and ?
				group by identifier, team, park;`
			this.db.query(query, [lat1, lat2, lon1, lon2])
				.then((result) => {
					const spritePromises = []
					_.forEach(result[0], (sprite) => {
						if (!fs.existsSync(path.join(this.imgPath, `/raid/${sprite.identifier}.png`))) {
							log.debug(`Sprite for ${sprite.identifier} not found, generating from ${path.join(__dirname, `../../../assets/${config.map.spriteDir}`)}`)
							spritePromises.push(this.gymImageCreator(sprite))
						}
					})
					Promise.all(spritePromises)
						.then(() => {
							resolve()
						})
						.catch((err) => {
							log.error(`checkGymSprites DB call errored with: ${err}`)
						})

				})
		})
	}
	async checkQuestSprites(lat1, lat2, lon1, lon2) {
		return new Promise((resolve) => {
			const query = `
				select rewards, latitude, longitude, end_timestamp from \`activeQuest\`  where 
				latitude between ? and ? and
				longitude between ? and ?
				and end_timestamp > UTC_TIMESTAMP()`
			this.db.query(query, [lat1, lat2, lon1, lon2])
				.then((result) => {
					const spritePromises = []
					_.forEach(result[0], (sprite) => {
						let identifier = sprite.rewards.replace(/[,"':”}{\]\[]/g, '')
						let rewards = JSON.parse(sprite.rewards)[0]
						rewards.identifier = identifier
						if (!fs.existsSync(path.join(this.imgPath, `/quest/${identifier}.png`))) {
							log.debug(`Sprite for quest ${identifier} not found, generating from ${path.join(__dirname, `../../../assets/${config.map.spriteDir}`)}`)
							spritePromises.push(this.questImageCreator(rewards))
						}
					})
					Promise.all(spritePromises)
						.then(() => {
							resolve()
						})
						.catch((err) => {
							log.error(`checkQuestSprites DB call errored with: ${err}`)
						})

				})
		})
	}

	async raidImageCreator(spriteObj) {
		return new Promise((resolve) => {
			const raidoregg = spriteObj.pokemon_id ? path.join(this.imgPath, `pokemon_icon_${spriteObj.pokemon_id.toString().padStart(3, '0')}_00.png`) : path.join(this.imgPath, `egg${spriteObj.raid_level}.png`)

			// load all needed images
			Promise.all([
				Jimp.read(path.join(this.imgPath, `gym${spriteObj.team}.png`)),			// Base shield
				Jimp.read(raidoregg), // Monster or egg
				Jimp.read(path.join(this.imgPath, `badge${spriteObj.raid_level}.png`)), // Raid level
				Jimp.read(path.join(this.imgPath, 'ex.png'))
			]).then((images) => {
				images[1].resize(60, 60)
				if (spriteObj.is_exclusive) images[0].composite(images[3], 0, 8)
				images[0]
					.composite(images[1], 20, 20)
					.composite(images[2], 60, 60)
					.write(path.join(this.imgPath, `/raid/${spriteObj.identifier}.png`))
				resolve()
			}).catch((err) => {
				log.error(`imageCreator errored with: ${err}`)
			})
		})
	}

	async gymImageCreator(spriteObj) {
		return new Promise((resolve) => {
			// load all needed images
			Promise.all([
				Jimp.read(path.join(this.imgPath, `gym${spriteObj.team}.png`)),			// Base shield
				Jimp.read(path.join(this.imgPath, 'ex.png'))
			]).then((images) => {
				if (spriteObj.park) images[0].composite(images[1], 30, 40)
				images[0]
					.write(path.join(this.imgPath, `/raid/${spriteObj.identifier}.png`))
				resolve()
			}).catch((err) => {
				log.error(`imageCreator errored with: ${err}`)
			})
		})
	}

	async questImageCreator(spriteObj) {
		return new Promise((resolve) => {
			// load all needed images
				let rewardImg = ''
				if (spriteObj.type === 7) rewardImg = path.join(this.imgPath, `pokemon_icon_${spriteObj.info.pokemon_id.toString().padStart(3, '0')}_00.png`)
				if (spriteObj.type === 2) rewardImg = path.join(this.imgPath, `rewards/reward_${spriteObj.info.item_id}_1.png`)
				if (spriteObj.type === 3) rewardImg = path.join(this.imgPath, `rewards/reward_stardust.png`)


			Promise.all([
				Jimp.read(path.join(this.imgPath, `pokestop.png`)),			// Base pokestop
				Jimp.read(rewardImg),
			]).then((images) => {
				images[1].resize(40, 40)
					.fade(0.2)
				images[0].composite(images[1], 5, 5)
				images[0]
					.write(path.join(this.imgPath, `/quest/${spriteObj.identifier}.png`))
				resolve()
			}).catch((err) => {
				log.error(`imageCreator errored with: ${err}`)
			})
		})
	}
}

module.exports = RawData