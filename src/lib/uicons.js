const axios = require('axios')
const { Mutex } = require('async-mutex')
const { UICONS } = require('uicons.js')

const mutex = new Mutex()

const uiconsIndex = /** @type {Record<string, UICONS>} */ ({})
const lastRetrieved = /** @type {Record<string, number>} */ ({})

const maxAge = 60 * 60 * 1000	// 1 hour

async function getAvailableIcons(log, baseUrl) {
	let currentSet = uiconsIndex[baseUrl]
	let lastRetrievedDate = lastRetrieved[baseUrl]
	try {
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
							const uicons = new UICONS(baseUrl)
							uicons.init(response.data)
							uiconsIndex[baseUrl] = uicons
							currentSet = uiconsIndex[baseUrl]
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
		if (currentSet) return currentSet.pokemon(pokemonId, form, evolution, gender, costume, alignment, shiny)
		if (this.fallback) return `${this.url}/pokemon_icon_${pokemonId.toString().padStart(3, '0')}_${form ? form.toString() : '00'}${evolution > 0 ? `_${evolution.toString()}` : ''}.${this.imageType}`
		return null
	}

	async eggIcon(level, hatched = false, ex = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return currentSet.raidEgg(level, hatched, ex)
		if (this.fallback) return `${this.url}/egg${level}.${this.imageType}`
		return null
	}

	async invasionIcon(gruntType) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.invasion(gruntType) : null
	}

	async typeIcon(typeId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.type(typeId) : null
	}

	async teamIcon(teamId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.team(teamId) : null
	}

	async rewardItemIcon(itemId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return currentSet.reward('item', itemId)
		if (this.fallback) return `${this.url}/rewards/reward_${itemId}_1.${this.imageType}`
		return null
	}

	async rewardStardustIcon(amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return currentSet.reward('stardust', amount)
		if (this.fallback) return `${this.url}/rewards/reward_stardust.${this.imageType}`
		return null
	}

	async rewardMegaEnergyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return currentSet.reward('mega_resource', pokemonId, amount)
		if (this.fallback) return `${this.url}/rewards/reward_mega_energy_${pokemonId}.${this.imageType}`
		return null
	}

	async rewardCandyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		if (currentSet) return currentSet.reward('candy', pokemonId, amount)
		if (this.fallback) return `${this.url}/rewards/reward_candy_${pokemonId}.${this.imageType}`
		return null
	}

	async rewardXlCandyIcon(pokemonId, amount) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.reward('xl_candy', pokemonId, amount) : null
	}

	async gymIcon(teamId, trainerCount = 0, inBattle = false, ex = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.gym(teamId, trainerCount, inBattle, ex) : null
	}

	async weatherIcon(weatherId) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.weather(weatherId) : null
	}

	async pokestopIcon(lureId = 0, invasionActive = false, incidentDisplayType = 0, questActive = false) {
		const currentSet = await getAvailableIcons(this.log, this.url)
		return currentSet ? currentSet.pokestop(lureId, 0, incidentDisplayType, invasionActive, questActive) : null
	}
}

module.exports = Uicons
