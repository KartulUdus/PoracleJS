const log = require('../logger')
const cp = require('child_process')
const _ = require('lodash')
const config = require('config')
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
}

module.exports = RawData