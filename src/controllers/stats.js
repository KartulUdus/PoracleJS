const Controller = require('./controller')

class Stats extends Controller {

	constructor() {
		super()
		this.pokemonCount = {}
	}

	async handle(obj) {
		const data = obj
		try {
			if (!this.pokemonCount[data.pokemon_id]) {
				this.pokemonCount[data.pokemon_id] = 0
			}
			this.pokemonCount[data.pokemon_id]++

		} catch (e) {
			this.log.error(`${data.encounter_id}: Can't seem to handle monster: `, e, data)
		}
	}

	calculateRarity() {
		return {
			"1": 2,
			"2": 3,
		}
	}
}

module.exports = Stats
