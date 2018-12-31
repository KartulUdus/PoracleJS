const Controller = require('./controller')

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
			const query =
				`select * from quest
            join humans on humans.id = quest.id
            where humans.enabled = 1 and
            (quest_id = ${data.quest_id} or reward_id = ${data.quest_id}) and
            (round( 6371000 * acos( cos( radians(${data.latitude}) )
              * cos( radians( humans.latitude ) )
              * cos( radians( humans.longitude ) - radians(${data.longitude}) )
              + sin( radians(${data.latitude}) )
              * sin( radians( humans.latitude ) ) ) < quest.distance and quest.distance != 0) or
               quest.distance = 0 and (${areastring}))`;


			log.debug(`Query constructed for questWhoCares: \n ${query}`)
			this.db.query(query)
				.then(
					function(result){
						log.info(`Quest id ${data.quest.id} for reward ${data.reward_id} was reported and ${result.length} humans cared`);
						resolve(result)
					}
				)
				.catch((err) => {log.error(`questWhoCares errored with: ${err}`)})
		})
	}

}

module.exports = Quest