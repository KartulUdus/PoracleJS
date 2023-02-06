const { Mutex } = require('async-mutex')
const Query = require('./query')

class MonsterAlarmMatch {
	constructor(log, db, config) {
		this.log = log
		this.db = new Query(log, db, config)
		this.config = config
		this.loadMutex = new Mutex()
	}

	async loadData() {
		return this.loadMutex.runExclusive(async () => {
			const pvpSpecific = {}
			const pvpEverything = {}
			for (const league of [500, 1500, 2500]) {
				pvpEverything[league] = []
				pvpSpecific[league] = []
			}

			const monsters = {}

			try {
				const monsterTable = await this.db.selectAllQuery('monsters', {})

				for (const monster of monsterTable) {
					if (monster.pvp_ranking_league) {
						if (monster.pokemon_id) {
							pvpSpecific[monster.pvp_ranking_league].push(monster)
						} else {
							pvpEverything[monster.pvp_ranking_league].push(monster)
						}
					} else {
						if (!(monster.pokemon_id in monsters)) {
							monsters[monster.pokemon_id] = []
						}
						monsters[monster.pokemon_id].push(monster)
					}
				}
			} catch (e) {
				this.log.error('Error loading monster alarm cache: alarms will not fire on this thread until fixed', e)

				this.pvpSpecific = null
				this.pvpEverything = null
				this.monsters = null

				return
			}

			this.pvpSpecific = pvpSpecific
			this.pvpEverything = pvpEverything
			this.monsters = monsters

			this.log.info('Refreshed monster alarm cache')
		})
	}

	async monsterWhoCares(data) {
		const pvpQueryLimit = this.config.pvp.pvpQueryMaxRank || this.config.pvp.pvpFilterMaxRank || 100

		const result = []

		if (!this.monsters) { // monsters are not loaded, try again
			await this.loadData()
			if (!this.monsters)	return []
		}

		// Basic Pokemon - everything
		result.push(...this.matchMonsters(data, this.monsters[0], { pokemon_id: +data.pokemon_id, form: +data.form, includeEverything: true }, 0))

		// Basic Pokemon - by pokemon Id
		result.push(...this.matchMonsters(data, this.monsters[data.pokemon_id], { pokemon_id: +data.pokemon_id, form: +data.form, includeEverything: true }, 0))

		// PVP Pokemon

		for (const [league, leagueDataArr] of Object.entries(data.pvpBestRank)) {
			for (const leagueData of leagueDataArr) {
				// if rank is good enough
				if (leagueData.rank <= pvpQueryLimit) {
					result.push(...this.matchMonsters(
						data,
						this.pvpEverything[league],
						{
							pokemon_id: +data.pokemon_id,
							form: +data.form,
							includeEverything: true,
						},
						league,
						leagueData,
					))
					result.push(...this.matchMonsters(
						data,
						this.pvpSpecific[league],
						{
							pokemon_id: +data.pokemon_id,
							form: +data.form,
							includeEverything: true,
						},
						league,
						leagueData,
					))
				}
			}
		}

		// PVP Evolution mon

		if (this.config.pvp.pvpEvolutionDirectTracking) {
			if (Object.keys(data.pvpEvolutionData).length !== 0) {
				for (const [pokemonId, pvpMon] of Object.entries(data.pvpEvolutionData)) {
					for (const [league, leagueDataArr] of Object.entries(pvpMon)) {
						for (const leagueData of leagueDataArr) {
							// if rank is good enough
							if (leagueData.rank <= pvpQueryLimit) {
								result.push(...this.matchMonsters(
									data,
									this.pvpSpecific[league],
									{
										pokemon_id: +pokemonId,
										form: +leagueData.form,
										includeEverything: false,
									},
									league,
									leagueData,
								))
							}
						}
					}
				}
			}
		}

		return this.validateHumans(
			result,
			{ lat: data.latitude, lon: data.longitude },
			data.matched,
			this.config.areaSecurity.enabled && this.config.areaSecurity.strictLocations,
		)
	}

	/* eslint-disable no-continue */
	// eslint-disable-next-line class-methods-use-this
	matchMonsters(data, monsters, pokemonTarget, league, leagueData) {
		const results = []
		if (monsters) {
			for (const monster of monsters) {
				if (!(monster.pokemon_id === pokemonTarget.pokemon_id || (pokemonTarget.includeEverything && monster.pokemon_id === 0))) {
					continue
				}
				if (monster.form && monster.form !== data.form) continue
				if (league) {
					if (leagueData.rank > monster.pvp_ranking_worst) continue
					if (leagueData.rank < monster.pvp_ranking_best) continue
					if (leagueData.cp < monster.pvp_ranking_min_cp) continue
					// The string conversion is because caps is sometimes populated with strings, and sometimes ints (see monster.js for possible fix)
					// But this is the least impact fix
					if (monster.pvp_ranking_cap && leagueData.caps && leagueData.caps.length && !leagueData.caps.map((x) => x.toString()).includes(monster.pvp_ranking_cap.toString())) continue
				}

				if (+data.iv < monster.min_iv) continue
				if (+data.iv > monster.max_iv) continue
				if (+data.tthSeconds < monster.min_time) continue
				if (+data.cp < monster.min_cp) continue
				if (+data.cp > monster.max_cp) continue
				if (monster.gender && monster.gender !== +data.gender) continue
				if (+data.level < monster.min_level) continue
				if (+data.level > monster.max_level) continue
				if (+data.atk < monster.atk) continue
				if (+data.def < monster.def) continue
				if (+data.sta < monster.sta) continue
				if (+data.atk > monster.max_atk) continue
				if (+data.def > monster.max_def) continue
				if (+data.sta > monster.max_sta) continue

				const weight = 1000 * data.weight
				if (weight < monster.min_weight) continue
				if (weight > monster.max_weight) continue
				if (data.rarityGroup < monster.rarity) continue
				if (data.rarityGroup > monster.max_rarity) continue
				if (+data.size < monster.size) continue
				if (+data.size > monster.max_size) continue

				results.push(monster)
			}
		}

		return results
	}

	async validateHumans(monsterList, monsterLocation, matchedAreas, strictAreasEnabled) {
		const humanIds = []

		if (!monsterList.length) return []

		// Find list of humans impacted
		for (const monster of monsterList) {
			if (!humanIds.includes(monster.id)) humanIds.push(monster.id)
		}

		// Retrieve humans

		const dbHumans = await this.db.mysteryQuery(
			`SELECT * FROM humans WHERE humans.id IN (${humanIds.map((x) => `'${x}'`).join(',')}) and humans.enabled = true and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%monster%')`,
		)

		const safeJsonParse = (x) => {
			try {
				return JSON.parse(x)
			} catch {
				return []
			}
		}

		// Map all _ to space.  This shouldn't strictly be necessary but sql matching uses like, and a _ would be
		// treated as any character so underscores would match spaces.

		const areas = matchedAreas.map((areaName) => areaName.replace(/_/g, ' '))
		const humans = Object.assign({}, ...dbHumans.map((x) => ({
			[x.id]: {
				...x,
				parsedArea: safeJsonParse(x.area).map((areaName) => areaName.replace(/_/g, ' ')),
				parsedAreaRestriction: x.area_restriction ? safeJsonParse(x.area_restriction).map((areaName) => areaName.replace(/_/g, ' ')) : null,
			},
		})))
		const filteredMonsters = []

		for (const monster of monsterList) {
			const human = humans[monster.id]

			if (!human) continue // remove humans filtered (blocked, not enabled etc)
			if (monster.profile_no !== human.current_profile_no) continue // remove entries for non-current profile
			if (monster.distance) {
				const distance = this.getDistance(
					{
						lat: human.latitude,
						lon: human.longitude,
					},
					monsterLocation,
				)

				if (distance > monster.distance) continue
			} else if (!human.parsedArea.some((x) => areas.includes(x))) continue
			if (strictAreasEnabled && human.parsedAreaRestriction) {
				if (!human.parsedAreaRestriction.some((x) => areas.includes(x))) continue
			}
			filteredMonsters.push({
				id: human.id,
				name: human.name,
				type: human.type,
				language: human.language,
				latitude: human.latitude,
				longitude: human.longitude,
				template: monster.template,
				distance: monster.distance,
				clean: monster.clean,
				ping: monster.ping,
				pokemon_id: monster.pokemon_id,
				pvp_ranking_cap: monster.pvp_ranking_cap,
				pvp_ranking_league: monster.pvp_ranking_league,
				pvp_ranking_worst: monster.pvp_ranking_worst,
			})
		}
		return filteredMonsters
	}
	/* eslint-enable no-continue */

	// eslint-disable-next-line class-methods-use-this
	getDistance(start, end) {
		const lat1 = parseFloat(start.lat)
		const lat2 = parseFloat(end.lat)
		const lon1 = parseFloat(start.lon)
		const lon2 = parseFloat(end.lon)

		// https://www.movable-type.co.uk/scripts/latlong.html

		const R = 6371e3 // metres
		const φ1 = lat1 * Math.PI / 180 // φ, λ in radians
		const φ2 = lat2 * Math.PI / 180
		const Δφ = (lat2 - lat1) * Math.PI / 180
		const Δλ = (lon2 - lon1) * Math.PI / 180

		const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
			+ Math.cos(φ1) * Math.cos(φ2)
			* Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

		const d = R * c // in metres

		return Math.ceil(d)
	}
}

module.exports = MonsterAlarmMatch