export const state = () => ({
	pokemon: {
		enabled: true
	},
	raid: {
		enabled:true
	},
	gym: {
		enabled:true
	}
})

export const mutations = {

	add (state, text) {
		state.pokemon.push({
			text: text,
			done: false
		})
	},

	toggleP (state, key) {
		state.pokemon[key] = !state.pokemon[key]
	}
}