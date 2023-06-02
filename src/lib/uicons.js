const axios = require('axios')
const { Mutex } = require('async-mutex')

const mutex = new Mutex()
const uiconsIndex = {}
const lastRetrieved = {}

function resolvePokemonIcon(availPokemon, imageType, pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, alignment = 0, shiny = false) {
	const evolutionSuffixes = evolution ? [`_e${evolution}`, ''] : ['']
	const formSuffixes = form ? [`_f${form}`, ''] : ['']
	const costumeSuffixes = costume ? [`_c${costume}`, ''] : ['']
	const genderSuffixes = gender ? [`_g${gender}`, ''] : ['']
	const alignmentSuffixes = alignment ? [`_a${alignment}`, ''] : ['']
	const shinySuffixes = shiny ? ['_s', ''] : ['']
	for (const evolutionSuffix of evolutionSuffixes) {
		for (const formSuffix of formSuffixes) {
			for (const costumeSuffix of costumeSuffixes) {
				for (const genderSuffix of genderSuffixes) {
					for (const alignmentSuffix of alignmentSuffixes) {
						for (const shinySuffix of shinySuffixes) {
							const result = `${pokemonId}${evolutionSuffix}${formSuffix}${costumeSuffix}${genderSuffix}${alignmentSuffix}${shinySuffix}.${imageType}`
							if (availPokemon.has(result)) return result
						}
					}
				}
			}
		}
	}
	return `0.${imageType}` // substitute
}

function resolveGymIcon(availGym, imageType, teamId, trainerCount = 0, inBattle = false, ex = false) {
	const trainerSuffixes = trainerCount ? [`_t${trainerCount}`, ''] : ['']
	const inBattleSuffixes = inBattle ? ['_b', ''] : ['']
	const exSuffixes = ex ? ['_ex', ''] : ['']
	for (const trainerSuffix of trainerSuffixes) {
		for (const inBattleSuffix of inBattleSuffixes) {
			for (const exSuffix of exSuffixes) {
				const result = `${teamId}${trainerSuffix}${inBattleSuffix}${exSuffix}.${imageType}`
				if (availGym.has(result)) return result
			}
		}
	}
	return `0.${imageType}` // substitute
}

function resolvePokestopIcon(availPokestop, imageType, lureId, invasionActive = false, incidentDisplayType = 0, questActive = false) {
	const invasionSuffixes = invasionActive ? ['_i', ''] : ['']
	const incidentDisplayTypeSuffixes = incidentDisplayType ? [`${incidentDisplayType}`, ''] : ['']
	const questSuffixes = questActive ? ['_q', ''] : ['']
	for (const invasionSuffix of invasionSuffixes) {
		for (const incidentDisplayTypeSuffix of incidentDisplayTypeSuffixes) {
			for (const questSuffix of questSuffixes) {
				const result = `${lureId}${invasionSuffix}${incidentDisplayTypeSuffix}${questSuffix}.${imageType}`
				if (availPokestop.has(result)) return result
			}
		}
	}
	return `0.${imageType}` // substitute
}

function resolveEggIcon(availEgg, imageType, level, hatched = false, ex = false) {
	const hatchedSuffixes = hatched ? ['_h', ''] : ['']
	const exSuffixes = ex ? ['_ex', ''] : ['']
	for (const hatchedSuffix of hatchedSuffixes) {
		for (const exSuffix of exSuffixes) {
			const result = `${level}${hatchedSuffix}${exSuffix}.${imageType}`
			if (availEgg.has(result)) return result
		}
	}
	return `0.${imageType}` // substitute
}

function resolveWeatherIcon(availWeather, imageType, weatherId) {
	const result = `${weatherId}.${imageType}`
	if (availWeather.has(result)) return result

	return `0.${imageType}` // substitute
}

function resolveInvasionIcon(availInvasion, imageType, gruntType) {
	const result = `${gruntType}.${imageType}`
	if (availInvasion.has(result)) return result

	return `0.${imageType}` // substitute
}

function resolveTypeIcon(availTypes, imageType, typeId) {
	const result = `${typeId}.${imageType}`
	if (availTypes.has(result)) return result

	return `0.${imageType}` // substitute
}

function resolveTeamIcon(availTeams, imageType, teamId) {
	const result = `${teamId}.${imageType}`
	if (availTeams.has(result)) return result

	return `0.${imageType}` // substitute
}

function resolveItemIcon(itemAvail, imageType, id, amount = 0) {
	if (amount) {
		const resultAmount = `${id}_a${amount}.${imageType}`
		if (itemAvail.has(resultAmount)) return resultAmount
	}
	const result = `${id}.${imageType}`
	if (itemAvail.has(result)) return result

	return `0.${imageType}` // substitute
}

const maxAge = 60 * 60 * 1000	// 1 hour

async function getAvailableIcons(log, baseUrl) {
	let currentSet
	let lastRetrievedDate
	try {
		currentSet = uiconsIndex[baseUrl]
		lastRetrievedDate = lastRetrieved[baseUrl]
		if (currentSet === undefined || lastRetrievedDate === undefined || Date.now() - lastRetrievedDate > maxAge) {
			await mutex.runExclusive(async () => {
				currentSet = uiconsIndex[baseUrl]
				lastRetrievedDate = lastRetrieved[baseUrl]
				if (currentSet === undefined || lastRetrievedDate === undefined || Date.now() - lastRetrievedDate > maxAge) {
					log.debug(`Fetching UICONS index from ${baseUrl}`)

					const timeoutMs = 10000
					const source = axios.CancelToken.source()
					const timeout = setTimeout(() => {
						source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
						// Timeout Logic
					}, timeoutMs)

					const response = await axios({
						method: 'get',
						url: `${baseUrl}/index.json`,
						validateStatus: ((status) => status < 500),
						cancelToken: source.token,
					})
					clearTimeout(timeout)

					switch (response.status) {
						case 404: {
							log.verbose(`Got 404 for UICONS data file from ${baseUrl}`)
							uiconsIndex[baseUrl] = null
							break
						}
						case 200: {
							const results = response.data
							currentSet = {
								raid: {
									egg: new Set(results.raid ? results.raid.egg : []),
								},
								gym: new Set(results.gym),
								team: new Set(results.team),
								weather: new Set(results.weather),
								pokestop: new Set(results.pokestop),
								reward: {
									item: new Set(results.reward ? results.reward.item : []),
									stardust: new Set(results.reward ? results.reward.stardust : []),
									candy: new Set(results.reward ? results.reward.candy : []),
									xl_candy: new Set(results.reward ? results.reward.xl_candy : []),
									mega_resource: new Set(results.reward ? results.reward.mega_resource : []),
								},
								invasion: new Set(results.invasion),
								pokemon: new Set(results.pokemon),
								type: new Set(results.type),
							}
							uiconsIndex[baseUrl] = currentSet
							break
						}
						default: {
							log.warn(`Cannot load UICONS file from ${baseUrl} code ${response.status} ${response.statusText}`)
						}
					}

					lastRetrieved[baseUrl] = Date.now()
				}
			})
		}
	} catch (e) {
		uiconsIndex[baseUrl] = null
		lastRetrieved[baseUrl] = Date.now()
		log.warn(`Cannot load UICONS file from ${baseUrl}`, e)
	}
	return currentSet
}

class Uicons {
	constructor(url, imageType, log, fallback) {
		this.url = url.endsWith('/') ? url.slice(0, -1) : url
		this.imageType = imageType || 'png'
		this.fallback = fallback ?? true
		this.log = log || console
	}

	async isUiconsRepository() {
		const currentSet = await getAvailableIcons(this.log, this.url)

		return !!currentSet
	}

	async pokemonIcon(pokemonId, form = 0, evolution = 0, gender = 0, costume = 0, alignment = 0, shiny = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return `${this.url}/pokemon/${resolvePokemonIcon(currentSet.pokemon, this.imageType, pokemonId, form, evolution, gender, costume, alignment, shiny)}`
		if (this.fallback) return `${this.url}/pokemon_icon_${pokemonId.toString().padStart(3, '0')}_${form ? form.toString() : '00'}${evolution > 0 ? `_${evolution.toString()}` : ''}.${this.imageType}`
		return null
	}

	async eggIcon(level, hatched = false, ex = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return `${this.url}/raid/egg/${resolveEggIcon(currentSet.raid.egg, this.imageType, level, hatched, ex)}`
		if (this.fallback) return `${this.url}/egg${level}.${this.imageType}`
		return null
	}

	async invasionIcon(gruntType) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/invasion/${resolveInvasionIcon(currentSet.invasion, this.imageType, gruntType)}` : null
	}

	async typeIcon(typeId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/type/${resolveTypeIcon(currentSet.type, this.imageType, typeId)}` : null
	}

	async teamIcon(teamId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/team/${resolveTeamIcon(currentSet.type, this.imageType, teamId)}` : null
	}

	async rewardItemIcon(itemId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return `${this.url}/reward/item/${resolveItemIcon(currentSet.reward.item, this.imageType, itemId)}`
		if (this.fallback) return `${this.url}/rewards/reward_${itemId}_1.${this.imageType}`
		return null
	}

	async rewardStardustIcon(amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return `${this.url}/reward/stardust/${resolveItemIcon(currentSet.reward.stardust, this.imageType, amount)}`
		if (this.fallback) return `${this.url}/rewards/reward_stardust.${this.imageType}`
		return null
	}

	async rewardMegaEnergyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return `${this.url}/reward/mega_resource/${resolveItemIcon(currentSet.reward.mega_resource, this.imageType, pokemonId, amount)}`
		if (this.fallback) return `${this.url}/rewards/reward_mega_energy_${pokemonId}.${this.imageType}`
		return null
	}

	async rewardCandyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return `${this.url}/reward/candy/${resolveItemIcon(currentSet.reward.candy, this.imageType, pokemonId, amount)}`
		if (this.fallback) return `${this.url}/rewards/reward_candy_${pokemonId}.${this.imageType}`
		return null
	}

	async rewardXlCandyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/reward/xl_candy/${resolveItemIcon(currentSet.reward.xl_candy, this.imageType, pokemonId, amount)}` : null
	}

	async gymIcon(teamId, trainerCount = 0, inBattle = false, ex = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/gym/${resolveGymIcon(currentSet.gym, this.imageType, teamId, trainerCount, inBattle, ex)}` : null
	}

	async weatherIcon(weatherId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/weather/${resolveWeatherIcon(currentSet.weather, this.imageType, weatherId)}` : null
	}

	async pokestopIcon(lureId = 0, invasionActive = false, incidentDisplayType = 0, questActive = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/pokestop/${resolvePokestopIcon(currentSet.pokestop, this.imageType, lureId, invasionActive, incidentDisplayType, questActive)}` : null
	}
}

module.exports = Uicons
