const Controller = require('./controller')

class Raid extends Controller{

/*
* raidWhoCares, takes data object
*/
	async raidWhoCares(data) {
		return new Promise(resolve => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `);
			});
			const query =
				`select * from raid 
            join humans on humans.id = raid.id
            where humans.enabled = 1 and
            (pokemon_id=${data.pokemon_id} or (pokemon_id=721 and raid.level=${data.level})) and 
            (raid.team = ${data.team_id} or raid.team = 4) and 
            (raid.park = ${data.park} or raid.park = 0) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < raid.distance and raid.distance != 0) or
               raid.distance = 0 and (${areastring}))
               group by humans.id`;

			log.debug(`Query constructed for raidWhoCares: \n ${query}`)
			this.db.query(query)
				.then(
					function(result){
						log.info(`Raid against ${data.name} appeared and ${result.length} humans cared`);
						resolve(result)
					}
				)
				.catch((err) => {log.error(`raidWhoCares errored with: ${err}`)})
		})
	}

	async eggWhoCares(data) {
		return new Promise(resolve => {
			let areastring = `humans.area like '%${data.matched[0] || 'doesntexist'}%' `;
			data.matched.forEach((area) => {
				areastring = areastring.concat(`or humans.area like '%${area}%' `);
			});
			const query =
				`select * from egg 
            join humans on humans.id = egg.id
            where humans.enabled = 1 and 
            (egg.park = ${data.park} or egg.park = 0) and
            raid_level = ${data.level} and 
            (egg.team = ${data.team_id} or egg.team = 4) and 
            (round( 6371000 * acos( cos( radians(${data.latitude}) ) 
              * cos( radians( humans.latitude ) ) 
              * cos( radians( humans.longitude ) - radians(${data.longitude}) ) 
              + sin( radians(${data.latitude}) ) 
              * sin( radians( humans.latitude ) ) ) < egg.distance and egg.distance != 0) or
               egg.distance = 0 and (${areastring}))`;

			log.debug(`Query constructed for eggWhoCares: \n ${query}`)
			this.db.query(query)
				.then(
					function(result){
						log.info(`Raid egg level ${data.level} appeared and ${result.length} humans cared`);
						resolve(result)
					}
				)
				.catch((err) => {log.error(`eggWhoCares errored with: ${err}`)})
		})
	}

}

module.exports = Raid