const log = require('../logger')
const fs = require('fs')
const _ = require('lodash')
const config = require('config')
const path = require('path')
const Controller = require('./controller')

class RawData extends Controller{

/*
* monsterWhoCares, takes data object
*/

	async getStartPos(locationSting) {
		return new Promise(resolve => {
		if (locationSting.match(/^[-+]?([1-8]?\d(\.\d+)?|90(\.0+)?),\s*[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]?\d))(\.\d+)?)$/)) {
			resolve (locationSting)
		} else{
			this.geolocate(locationSting).then(function(loc){
				resolve(`${loc[0].latitude}, ${loc[0].longitude}`)
			})}
		})

	}

	async getLiveMonsters(lat1, lat2, lon1, lon2) {
		return new Promise(resolve => {
			this.db.query('SELECT * from pokemon where latitude between ? and ? and longitude between ? and ? and disappear_time > UTC_TIMESTAMP()', [lat1, lat2, lon1, lon2])
				.then((result) => {resolve(result[0])})
				.catch((err) => {log.error(`getLiveMonsters errored with: ${err}`)})
		})
	}

	async getLiveRaids(lat1, lat2, lon1, lon2) {
		return new Promise(resolve => {
			this.db.query('SELECT * from activeRaid where latitude between ? and ? and longitude between ? and ? and end > UTC_TIMESTAMP() and pokemon_id!=0', [lat1, lat2, lon1, lon2])
				.then((result) => {resolve(result[0])})
				.catch((err) => {log.error(`getLiveRaids errored with: ${err}`)})
		})
	}

	async getLiveEggs(lat1, lat2, lon1, lon2) {
		return new Promise(resolve => {
			this.db.query('SELECT * from activeRaid where latitude between ? and ? and longitude between ? and ? and end > UTC_TIMESTAMP() and pokemon_id=0', [lat1, lat2, lon1, lon2])
				.then((result) => {resolve(result[0])})
				.catch((err) => {log.error(`getLiveEggs errored with: ${err}`)})
		})
	}

	async getGyms(lat1, lat2, lon1, lon2) {
		return new Promise(resolve => {
			this.db.query('SELECT * from `gym-info` where latitude between ? and ? and longitude between ? and ?', [lat1, lat2, lon1, lon2])
				.then((result) => {resolve(result[0])})
				.catch((err) => {log.error(`getGyms errored with: ${err}`)})
		})
	}

	async checkSprites(lat1, lat2, lon1, lon2) {
		return new Promise(resolve => {
			const query = `
				select concat('raid',pokemon_id,'level', raid_level,'t', team,'ex', is_exclusive) as identifier,  pokemon_id, raid_level, team, is_exclusive from activeRaid where 
				latitude between ? and ? and
				longitude between ? and ?
				group by identifier;`
			this.db.query(query, [lat1, lat2, lon1, lon2])
				.then((result) => {

					_.forEach(result[0], (sprite) => {
						console.log(sprite.identifier)
						if(!fs.existsSync(path.join(__dirname, `../../../assets/${config.map.spriteDir}/raid/${sprite.identifier}.png`))){
							log.debug(`Sprite for ${sprite.identifier} not found, generating from ${path.join(__dirname, `../../../assets/${config.map.spriteDir}`)}`)
							this.imageCreator(sprite)
						}
					})
					resolve(result[0])
				})
				.catch((err) => {log.error(`checkSprites DB call errored with: ${err}`)})
		})
	}

	async imageCreator(spriteObj) {
		return new Promise(resolve => {

			resolve(true)
		})
	}

}

module.exports = RawData