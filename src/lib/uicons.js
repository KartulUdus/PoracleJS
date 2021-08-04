const axios = require('axios')
const { Mutex } = require('async-mutex')

const mutex = new Mutex()
const availablePokemon = {}

function resolvePokemonIcon(availPokemon, imageType, pokemonId, form = 0, evolution = 0, gender = 0, costume = 0,
	shiny = false) {
	const evolutionSuffixes = evolution ? [`_e${evolution}`, ''] : ['']
	const formSuffixes = form ? [`_f${form}`, ''] : ['']
	const costumeSuffixes = costume ? [`_c${costume}`, ''] : ['']
	const genderSuffixes = gender ? [`_g${gender}`, ''] : ['']
	const shinySuffixes = shiny ? ['_s', ''] : ['']
	for (const evolutionSuffix of evolutionSuffixes) {
		for (const formSuffix of formSuffixes) {
			for (const costumeSuffix of costumeSuffixes) {
				for (const genderSuffix of genderSuffixes) {
					for (const shinySuffix of shinySuffixes) {
						const result = `${pokemonId}${evolutionSuffix}${formSuffix}${costumeSuffix}${genderSuffix}${shinySuffix}.${imageType}`
						if (availPokemon.has(result)) return result
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

function resolvePokestopIcon(availPokestop, imageType, lureId, invasionActive = false, questActive = false) {
	const invasionSuffixes = invasionActive ? ['_i', ''] : ['']
	const questSuffixes = questActive ? ['_q', ''] : ['']
	for (const invasionSuffix of invasionSuffixes) {
		for (const questSuffix of questSuffixes) {
			const result = `${lureId}${invasionSuffix}${questSuffix}.${imageType}`
			if (availPokestop.has(result)) return result
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

function resolveInvasionIcon(availInvasion, imageType, gruntType) {
	const result = `${gruntType}.${imageType}`
	if (availInvasion.has(result)) return result

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

const maxAge = 60 * 60 * 1000

async function getAvailableIcons(log, baseUrl) {
	let currentSet

	try {
		currentSet = availablePokemon[baseUrl]
		if (currentSet === undefined || Date.now() - currentSet.lastRetrieved > maxAge) {
			await mutex.runExclusive(async () => {
				currentSet = availablePokemon[baseUrl]
				if (currentSet === undefined || Date.now() - currentSet.lastRetrieved > maxAge) {
					const response = await axios.get(`${baseUrl}/index.json`)
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
					}
					currentSet.lastRetrieved = Date.now()
					availablePokemon[baseUrl] = currentSet
				}
			})
		}
	} catch (e) {
		log.warn(`Cannot load UICONS file from ${baseUrl}`, e)
	}
	return currentSet
}

class Uicons {
	constructor(url, imageType, log) {
		this.url = url
		this.imageType = imageType || 'png'
		this.log = log || console
	}

	async pokemonIcon(pokemonId, form = 0, evolution = 0, female = false, costume = 0, shiny = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/pokemon/${resolvePokemonIcon(currentSet.pokemon, this.imageType, pokemonId, form, evolution, female, costume, shiny)}` : null
	}

	async eggIcon(level, hatched = false, ex = false) {
		const currentSet = await getAvailableIcons(this.url)
		return currentSet ? `${this.url}/raid/egg/${resolveEggIcon(currentSet.raid.egg, this.imageType, level, hatched, ex)}` : null
	}

	async invasionIcon(gruntType) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/invasion/${resolveInvasionIcon(currentSet.invasion, this.imageType, gruntType)}` : null
	}

	async rewardItemIcon(itemId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/reward/item/${resolveItemIcon(currentSet.reward.item, this.imageType, itemId)}` : null
	}

	async rewardStardustIcon(amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/reward/stardust/${resolveItemIcon(currentSet.reward.stardust, this.imageType, amount)}` : null
	}

	async rewardMegaEnergyIcon(itemId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/reward/mega_resource/${resolveItemIcon(currentSet.reward.mega_resource, this.imageType, itemId)}` : null
	}

	async rewardCandyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/reward/candy/${resolveItemIcon(currentSet.reward.candy, this.imageType, pokemonId, amount)}` : null
	}

	async rewardXlCandyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/reward/xl_candy/${resolveItemIcon(currentSet.reward.xl_candy, this.imageType, pokemonId, amount)}` : null
	}

	async gymIcon(teamId, trainerCount = 0, inBattle = false, ex = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/gym/${resolveGymIcon(currentSet.gym, this.imageType, teamId, trainerCount, inBattle, ex)}` : null
	}

	async pokestopIcon(lureId = 0, invasionActive = false, questActive = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? `${this.url}/pokestop/${resolvePokestopIcon(currentSet.pokestop, this.imageType, lureId, invasionActive, questActive)}` : null
	}
}

module.exports = Uicons