export const state = () => ({
	pokemonMarkers: [],
	raidMarkers: [],
	gymMarkers: [],
	questMarkers: []
})

Array.prototype.inArray = function(comparer) {for(var i=0; i < this.length; i++) {if(comparer(this[i]))return true}return false}
Array.prototype.pushIfNotExist = function(element, comparer) {if (!this.inArray(comparer)){this.push(element)}}


export const mutations = {

	addP (state, pokemon) {
		let marker = {
			encounter_id: pokemon.encounter_id,
			lat: pokemon.latitude,
			lon: pokemon.longitude,
			icon: pokemon.icon,
			link: pokemon.link,
			disappear_time: pokemon.disappear_time,
			raw: pokemon,
			mapLink: `https://www.google.com/maps/search/?api=1&query=${pokemon.latitude},${pokemon.longitude}`,
			humanWords: pokemon.humanwords
		}
		state.pokemonMarkers.pushIfNotExist(marker, function(e) {
			return e.lat === marker.lat && e.lon === marker.lon && e.encounter_id === marker.encounter_id;
		})
	},
	addR (state, raid) {

		let marker = {
			id: raid.pokemon_id,
			gym_id: raid.gym_id,
			lat: raid.latitude,
			lon: raid.longitude,
			icon: raid.icon,
			link: raid.link,
			start: raid.start,
			end: raid.end,
			raw: raid,
			mapLink: `https://www.google.com/maps/search/?api=1&query=${raid.latitude},${raid.longitude}`,
			humanWords: raid.humanWords,
			pLink: raid.pLink,
			eLink: `static/egg${raid.raid_level}.png`,
			key: `${raid.gym_id}${raid.pokemon_id}${raid.end}${raid.team}${raid.is_exclusive}`
		}

		state.raidMarkers.map(obj => [marker].find(o => o.lat === obj.lat && o.lon === obj.lon && obj.pokemon_id === 0) || obj)
		state.raidMarkers.pushIfNotExist(marker, function(e) {
			return e.lat === marker.lat && e.lon === marker.lon && e.link === marker.link;
		})
	},
	addQ (state, quest) {

		let marker = {
			id: quest.pokestop_id,
			lat: quest.latitude,
			lon: quest.longitude,
			name: quest.pokestop_name,
			icon: quest.icon,
			link: quest.pokestop_url,
			end: quest.end_timestamp,
			mapLink: `https://www.google.com/maps/search/?api=1&query=${quest.latitude},${quest.longitude}`,
			qlink: quest.link,
			key: quest.identifier
		}

		state.questMarkers.map(obj => [marker].find(o => o.lat === obj.lat && o.lon === obj.lon && obj.identifier === o.identifier))
		state.questMarkers.pushIfNotExist(marker, function(e) {
			return e.lat === marker.lat && e.lon === marker.lon && e.qlink === marker.qlink;
		})
	},
	addG (state, gym) {

		let marker = {
			id: gym.gym_id,
			lat: gym.latitude,
			lon: gym.longitude,
			ex: gym.park,
			name: gym.gym_name,
			url: gym.url,
			link: gym.link,
			icon: gym.icon,
			mapLink: `https://www.google.com/maps/search/?api=1&query=${gym.latitude},${gym.longitude}`,
			key: `${gym.gym_id}${gym.latitude}${gym.longitude}${gym.team}${gym.sponsor_id}`
		}
		// First Try to update raid marker, then add not existing Raid to markers
		let shouldAddGym = true
		state.raidMarkers.forEach(r => {
			if (r.lat.toString().substring(0, 8) === marker.lat.toString().substring(0, 8) &&
				r.lon.toString().substring(0, 8) === marker.lon.toString().substring(0, 8)){shouldAddGym = false}
		})

		if (shouldAddGym){
			state.gymMarkers.pushIfNotExist(marker, function(r) {
				return r.lat.toString().substring(0, 8) === marker.lat.toString().substring(0, 8) &&
					r.lon.toString().substring(0, 8) === marker.lon.toString().substring(0, 8);
			})
		}
	},
	clearBadMarkers(state, bounds){
		for( let i = 0; i < state.pokemonMarkers.length-1; i++){
			let date = new Date(state.pokemonMarkers[i].disappear_time)
			let disTimeLocal = new Date(date.getTime()+date.getTimezoneOffset()*60*1000)
			let offset = date.getTimezoneOffset() / 60
			let hours = date.getHours()
			disTimeLocal.setHours(hours - offset)
			if (state.pokemonMarkers[i].lat > bounds._northEast.lat ||
				state.pokemonMarkers[i].lat < bounds._southWest.lat ||
				state.pokemonMarkers[i].lon > bounds._northEast.lng ||
				state.pokemonMarkers[i].lon < bounds._southWest.lng ||
				disTimeLocal.getTime() < new Date().getTime())
			{state.pokemonMarkers.splice(i, 1)}
		}
		for( let i = 0; i < state.raidMarkers.length-1; i++){
			let date = new Date(state.raidMarkers[i].end)
			let disTimeLocal = new Date(date.getTime()+date.getTimezoneOffset()*60*1000)
			let offset = date.getTimezoneOffset() / 60
			let hours = date.getHours()
			disTimeLocal.setHours(hours - offset)
			if (state.raidMarkers[i].lat > bounds._northEast.lat ||
				state.raidMarkers[i].lat < bounds._southWest.lat ||
				state.raidMarkers[i].lon > bounds._northEast.lng ||
				state.raidMarkers[i].lon < bounds._southWest.lng ||
				disTimeLocal.getTime() < new Date().getTime())
			{state.raidMarkers.splice(i, 1)}
		}
		for( let i = 0; i < state.questMarkers.length-1; i++){
			let date = new Date(state.questMarkers[i].end)
			let disTimeLocal = new Date(date.getTime()+date.getTimezoneOffset()*60*1000)
			let offset = date.getTimezoneOffset() / 60
			let hours = date.getHours()
			disTimeLocal.setHours(hours - offset)
			if (state.questMarkers[i].lat > bounds._northEast.lat ||
				state.questMarkers[i].lat < bounds._southWest.lat ||
				state.questMarkers[i].lon > bounds._northEast.lng ||
				state.questMarkers[i].lon < bounds._southWest.lng ||
				disTimeLocal.getTime() < new Date().getTime())
			{state.questMarkers.splice(i, 1)}
		}
		for( let i = 0; i < state.gymMarkers.length-1; i++){
			if (state.gymMarkers[i].lat > bounds._northEast.lat ||
				state.gymMarkers[i].lat < bounds._southWest.lat ||
				state.gymMarkers[i].lon > bounds._northEast.lng ||
				state.gymMarkers[i].lon < bounds._southWest.lng	)
			{state.gymMarkers.splice(i, 1)}
		}
	}
}