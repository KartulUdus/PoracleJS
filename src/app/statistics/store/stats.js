export const state = () => ({
	requests: [],
	responses: [],
	discordMessages: [],
	errors: [],
	warnings: [],
	chart1: {
		labels: [],
		datasets: [
			{
				label: 'Messages last 5 minutes',
				backgroundColor: '#41b883',
				data: [12,123,11,1,23,1,123,124,123,11,23]
			}
		]
	}

})

export const mutations = {

	timeArray (state, millisecondsFromNow) {

		const firstTime = Math.trunc(new Date().valueOf() - timeTarget)
		let timeArray = []
		for(let i = 0; i< 10; i++){
			timeArray.push(new Date(firstTime + (i * timeTarget/10)))
		}


		state.pokemonMarkers.pushIfNotExist(marker, function(e) {
			return e.lat === marker.lat && e.lon === marker.lon && e.encounter_id === marker.encounter_id;
		})
	},

}