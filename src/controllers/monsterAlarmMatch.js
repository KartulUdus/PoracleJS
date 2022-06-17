const Query = require('./query')

class MonsterAlarmMatch {
	constructor(log, db, config) {
		this.log = log
		this.db = new Query(log, db, config)
		this.config = config
	}

	async loadData() {
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
			this.log.error('Error loading monster alarm cache ', e)
			return
		}

		this.pvpSpecific = pvpSpecific
		this.pvpEverything = pvpEverything
		this.monsters = monsters

		this.log.info('Refreshed monster alarm cache')
	}

	async monsterWhoCares(data) {
		const pvpQueryLimit = this.config.pvp.pvpQueryMaxRank || this.config.pvp.pvpFilterMaxRank || 100

		const result = []

		// Basic Pokemon - everything
		result.push(...this.matchMonsters(data, this.monsters[0], { pokemon_id: data.pokemon_id, form: data.form, includeEverything: true }, 0))

		// Basic Pokemon - by pokemon Id
		result.push(...this.matchMonsters(data, this.monsters[data.pokemon_id], { pokemon_id: data.pokemon_id, form: data.form, includeEverything: true }, 0))

		// PVP Pokemon

		for (const [league, leagueDataArr] of Object.entries(data.pvpBestRank)) {
			for (const leagueData of leagueDataArr) {
				// if rank is good enough
				if (leagueData.rank <= pvpQueryLimit) {
					result.push(...this.matchMonsters(
						data,
						this.pvpEverything[league],
						{
							pokemon_id: data.pokemon_id,
							form: data.form,
							includeEverything: true,
						},
						league,
						leagueData,
					))
					result.push(...this.matchMonsters(
						data,
						this.pvpSpecific[league],
						{
							pokemon_id: data.pokemon_id,
							form: data.form,
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
										pokemon_id: pokemonId,
										form: leagueData.form,
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
					if (monster.pvp_ranking_cap && leagueData.caps && leagueData.caps.length && !leagueData.caps.includes(monster.pvp_ranking_cap)) continue
				}

				if (data.iv < monster.min_iv) continue
				if (data.iv > monster.max_iv) continue
				if (data.tthSeconds < monster.min_time) continue
				if (data.cp < monster.min_cp) continue
				if (data.cp > monster.max_cp) continue
				if (monster.gender && monster.gender !== data.gender) continue
				if (data.level < monster.min_level) continue
				if (data.level > monster.max_level) continue
				if (data.atk < monster.atk) continue
				if (data.def < monster.def) continue
				if (data.sta < monster.sta) continue
				if (data.atk > monster.max_atk) continue
				if (data.def > monster.max_def) continue
				if (data.sta > monster.max_sta) continue

				const weight = 1000 * data.weight
				if (weight < monster.min_weight) continue
				if (weight > monster.max_weight) continue
				if (data.rarityGroup < monster.rarity) continue
				if (data.rarityGroup > monster.max_rarity) continue

				results.push(monster)
			}
		}

		return results
	}

	async validateHumans(monsterList, monsterLocation, areas, strictAreasEnabled) {
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

		const humans = Object.assign({}, ...dbHumans.map((x) => ({
			[x.id]: {
				...x,
				parsedArea: safeJsonParse(x.area),
				parsedAreaRestriction: x.area_restriction ? safeJsonParse(x.area_restriction) : null,
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

	// buildQuery(queryName, data, strictareastring, areastring, pokemonTarget, league, leagueData) {
	// 	const pokemonQueryString = `(pokemon_id=${pokemonTarget.pokemon_id}${pokemonTarget.includeEverything ? ' or pokemon_id=0' : ''}) and (form = 0 or form = ${pokemonTarget.form})`
	//
	// 	let pvpQueryString = ''
	// 	const pvpSecurityEnabled = this.config.discord.commandSecurity && this.config.discord.commandSecurity.pvp
	//
	// 	if (!league) {
	// 		pvpQueryString = 'pvp_ranking_league = 0'
	// 	} else {
	// 		if (pvpSecurityEnabled) {
	// 			pvpQueryString = pvpQueryString.concat('((humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE \'%pvp%\') and (')
	// 		}
	// 		pvpQueryString = pvpQueryString.concat(`pvp_ranking_league = ${league} and pvp_ranking_worst >= ${leagueData.rank} and pvp_ranking_best <= ${leagueData.rank} and pvp_ranking_min_cp <= ${leagueData.cp} and (pvp_ranking_cap = 0 ${leagueData.caps && leagueData.caps.length ? `or pvp_ranking_cap IN (${leagueData.caps})` : ''})`)
	//
	// 		if (pvpSecurityEnabled) {
	// 			pvpQueryString = pvpQueryString.concat('))')
	// 		}
	// 	}
	//
	// 	let query = `
	// 	select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.pokemon_id, monsters.pvp_ranking_cap, monsters.pvp_ranking_league, monsters.pvp_ranking_worst from monsters
	// 	join humans on (humans.id = monsters.id and humans.current_profile_no = monsters.profile_no)
	// 	where humans.enabled = true and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%monster%') and
	// 	(${pokemonQueryString}) and
	// 	min_iv<=${data.iv} and
	// 	max_iv>=${data.iv} and
	// 	min_time<=${data.tthSeconds} and
	// 	min_cp<=${data.cp} and
	// 	max_cp>=${data.cp} and
	// 	(gender = ${data.gender} or gender = 0) and
	// 	min_level<=${data.level} and
	// 	max_level>=${data.level} and
	// 	atk<=${data.atk} and
	// 	def<=${data.def} and
	// 	sta<=${data.sta} and
	// 	max_atk>=${data.atk} and
	// 	max_def>=${data.def} and
	// 	max_sta>=${data.sta} and
	// 	min_weight<=${data.weight * 1000} and
	// 	max_weight>=${data.weight * 1000} and
	// 	rarity<=${data.rarityGroup} and
	// 	max_rarity>=${data.rarityGroup} and
	// 	(${pvpQueryString})
	// 	${strictareastring}
	// 	`
	//
	// 	if (['pg', 'mysql'].includes(this.config.database.client)) {
	// 		query = query.concat(`
	// 			and
	// 			(
	// 				(
	// 					monsters.distance != 0 and
	// 					round(
	// 						6371000	* acos(
	// 							cos( radians(${data.latitude}) )
	// 							* cos( radians( humans.latitude ) )
	// 							* cos( radians( humans.longitude ) - radians(${data.longitude}) )
	// 							+ sin( radians(${data.latitude}) )
	// 							* sin( radians( humans.latitude ) )
	// 						)
	// 					) < monsters.distance
	// 				)
	// 				or
	// 				(
	// 					monsters.distance = 0 and (${areastring})
	// 				)
	// 			)
	// 			`)
	// 	} else {
	// 		query = query.concat(`
	// 				and ((monsters.distance = 0 and (${areastring})) or monsters.distance > 0)
	// 				`)
	// 	}
	// 	this.log.silly(`${data.encounter_id}: Query[${queryName}] ${query}`)
	// 	return query
	// }
}

module.exports = MonsterAlarmMatch