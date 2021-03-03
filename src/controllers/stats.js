const EventEmitter = require('events')

class Stats extends EventEmitter {
	constructor(log, config) {
		super()
		this.config = config
		this.log = log
		this.pokemonCount = {}
	}

	// eslint-disable-next-line class-methods-use-this
	expirePokemonCount(pokemonCount, currentHourTimestamp) {
		Object.entries(pokemonCount).forEach(([timestamp]) => {
			if (timestamp < (currentHourTimestamp - this.config.stats.pokemonCountToKeep * 3600)) {
				delete pokemonCount[timestamp]
			}
		})
	}

	async handle(obj) {
		const data = obj
		try {
			const nowTimestamp = Math.floor(Date.now() / 1000)
			const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)
			if (!this.pokemonCount[currentHourTimestamp]) {
				this.pokemonCount[currentHourTimestamp] = { total: 0 }
			}
			const currentHourCount = this.pokemonCount[currentHourTimestamp]
			if (!currentHourCount[data.pokemon_id]) {
				currentHourCount[data.pokemon_id] = 0
			}
			currentHourCount[data.pokemon_id]++ // does not make the distinction between just seen or scanned
			currentHourCount.total++
		} catch (e) {
			this.log.error(`${data.encounter_id}: Can't seem to handle monster: `, e, data)
		}
	}

	calculateRarity() {
		const nowTimestamp = Math.floor(Date.now() / 1000)
		const currentHourTimestamp = nowTimestamp - (nowTimestamp % 3600)

		this.expirePokemonCount(this.pokemonCount, currentHourTimestamp) // here or use a setTimeout loop?

		const totalPokemonCount = {}

		Object.entries(this.pokemonCount).forEach(([timestamp]) => {
			Object.keys(this.pokemonCount[timestamp]).map((pokemonId) => {
				if (!totalPokemonCount[pokemonId]) totalPokemonCount[pokemonId] = 0
				totalPokemonCount[pokemonId] += this.pokemonCount[timestamp][pokemonId]
			})
		})

		const currentPokemonTotal = totalPokemonCount.total
		delete totalPokemonCount.total

		if (currentPokemonTotal < this.config.stats.minSampleSize) {
			return {
				1: [],
				2: [],
				3: [],
				4: [],
				5: [],
				6: [],
			}
		}

		const rarityGroup6 = [...Array(this.config.stats.maxPokemonId).keys()].filter((pokemonId) => pokemonId > 0 && !Object.keys(totalPokemonCount).includes(pokemonId.toString())).filter((pokemonId) => !this.config.stats.excludeFromRare.includes(pokemonId))
		const rarityGroup5 = Object.keys(totalPokemonCount).filter((pokemonId) => totalPokemonCount[pokemonId] / currentPokemonTotal <= this.config.stats.rarityGroup5UltraRare / 100).map((x) => parseInt(x, 10)).filter((pokemonId) => !this.config.stats.excludeFromRare.includes(pokemonId))
		const rarityGroup4 = Object.keys(totalPokemonCount).filter((pokemonId) => totalPokemonCount[pokemonId] / currentPokemonTotal > this.config.stats.rarityGroup5UltraRare / 100 && totalPokemonCount[pokemonId] / currentPokemonTotal <= this.config.stats.rarityGroup4VeryRare / 100).map((x) => parseInt(x, 10)).filter((pokemonId) => !this.config.stats.excludeFromRare.includes(pokemonId))
		const rarityGroup3 = Object.keys(totalPokemonCount).filter((pokemonId) => totalPokemonCount[pokemonId] / currentPokemonTotal > this.config.stats.rarityGroup4VeryRare / 100 && totalPokemonCount[pokemonId] / currentPokemonTotal <= this.config.stats.rarityGroup3Rare / 100).map((x) => parseInt(x, 10)).filter((pokemonId) => !this.config.stats.excludeFromRare.includes(pokemonId))
		const rarityGroup2 = Object.keys(totalPokemonCount).filter((pokemonId) => totalPokemonCount[pokemonId] / currentPokemonTotal > this.config.stats.rarityGroup3Rare / 100 && totalPokemonCount[pokemonId] / currentPokemonTotal <= this.config.stats.rarityGroup2Uncommon / 100).map((x) => parseInt(x, 10))
		const rarityGroup1 = Object.keys(totalPokemonCount).filter((pokemonId) => totalPokemonCount[pokemonId] / currentPokemonTotal > this.config.stats.rarityGroup2Uncommon / 100).map((x) => parseInt(x, 10))

		return {
			1: rarityGroup1,
			2: rarityGroup2,
			3: rarityGroup3,
			4: rarityGroup4,
			5: rarityGroup5,
			6: rarityGroup6,
		}
	}
}

module.exports = Stats
