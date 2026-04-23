const fs = require('fs')
const stripJsonComments = require('strip-json-comments')
const path = require('path')

class FilterProcessor {
	constructor(config, query, trackingChanger) {
		this.query = query
		this.config = config
		this.trackingChanger = trackingChanger
	}

	// eslint-disable-next-line class-methods-use-this
	async loadFilter(filterName) {
		let filter

		try {
			const filterText = stripJsonComments(fs.readFileSync(path.join(__dirname, '../../config/filters', `${filterName}.json`), 'utf8'))
			filter = JSON.parse(filterText)
		} catch (err) {
			throw new Error(`filters/${filterName}.json - ${err.message}`)
		}

		return filter
	}

	async applyFilter(id, profileNo, filterName, performUserChecks) {
		let filter = await this.loadFilter(filterName)
		let messages = ''

		if (filter.based_on) {
			// Load other filters
			const filterStack = [[filterName, filter]]
			let currentFilter = filter
			while (currentFilter.based_on) {
				// check here for circular reference ==> crash
				const baseFilter = await this.loadFilter(currentFilter.based_on)
				filterStack.unshift([currentFilter.based_on, baseFilter])
				currentFilter = baseFilter
			}

			// Now combine filters

			filter = {}
			for (const [, addition] of filterStack) {
				for (const category of ['pokemon', 'egg']) {
					if (addition[category]) {
						if (!(category in filter)) filter[category] = {}
						Object.assign(filter[category], addition[category])
					}
				}
			}
		}
		if (filter.pokemon) {
			messages += await this.applyPokemonFilter(id, profileNo, filter.pokemon, performUserChecks)
		}

		return messages
	}

	async applyPokemonFilter(id, profileNo, filter, performUserChecks) {
		const defaultTo = ((value, x) => ((value === undefined) ? x : value))

		if (filter.pokemon.length === 0) filter.pokemon = [0]

		const insert = filter.pokemon.map((pokemonId) => {
			let distance
			if (performUserChecks) {
				distance = +filter.distance || this.config.tracking.defaultDistance || 0
				distance = Math.min(distance, this.config.tracking.maxDistance || 40000000) // circumference of Earth
			} else {
				distance = +defaultTo(filter.distance, 0)
			}

			const newRow = {
				id,
				profile_no: profileNo,
				ping: defaultTo(filter.ping, ''),
				template: (filter.template || this.config.general.defaultTemplateName).toString(),
				pokemon_id: +pokemonId,
				distance: +distance,
				min_iv: +defaultTo(filter.min_iv, -1),
				max_iv: +defaultTo(filter.max_iv, 100),
				min_cp: +defaultTo(filter.min_cp, 0),
				max_cp: +defaultTo(filter.max_cp, 9000),
				min_level: +defaultTo(filter.min_level, 0),
				max_level: +defaultTo(filter.max_level, 40),
				atk: +defaultTo(filter.atk, 0),
				def: +defaultTo(filter.def, 0),
				sta: +defaultTo(filter.sta, 0),
				min_weight: +defaultTo(filter.min_weight, 0),
				max_weight: +defaultTo(filter.max_weight, 9000000),
				form: +defaultTo(filter.form, 0),
				max_atk: +defaultTo(filter.max_atk, 15),
				max_def: +defaultTo(filter.max_def, 15),
				max_sta: +defaultTo(filter.max_sta, 15),
				gender: +defaultTo(filter.gender, 0),
				clean: +defaultTo(filter.clean, 0),
				pvp_ranking_league: +defaultTo(filter.pvp_ranking_league, 0),
				pvp_ranking_best: +defaultTo(filter.pvp_ranking_best, 1),
				pvp_ranking_worst: +defaultTo(filter.pvp_ranking_worst, 4096),
				pvp_ranking_min_cp: +defaultTo(filter.pvp_ranking_min_cp, 0),
				rarity: +defaultTo(filter.rarity, -1),
				max_rarity: +defaultTo(filter.max_rarity, 6),
				min_time: +defaultTo(filter.min_time, 0),
			}

			return newRow
		})

		return this.trackingChanger.applyMonsters(insert, id, profileNo)
	}
}

module.exports = FilterProcessor