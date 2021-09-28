const fs = require('fs')
const { invasions } = require('pogo-data-generator')
const Fetch = require('node-fetch')

const { log } = require('../lib/logger')

const fetch = async (url) => new Promise((resolve) => {
	Fetch(url)
		.then((res) => res.json())
		.then((json) => resolve(json))
})

module.exports.update = async function update() {
	// Write monsters/moves/items/questTypes
	try {
		log.info('Fetching latest Game Master...')
		const gameMaster = await fetch('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-poracle.json')

		log.info('Creating new Game Master...')
		Object.keys(gameMaster).forEach((category) => {
			fs.writeFile(
				`./src/util/${category}.json`,
				JSON.stringify(gameMaster[category], null, 2),
				'utf8',
				() => { },
			)
		})
	} catch (e) {
		log.info('Could not fetch latest GM, using existing...')
	}

	// Write grunts
	try {
		log.info('Fetching latest invasions...')
		fs.writeFile(
			'./src/util/grunts.json',
			JSON.stringify(await invasions(), null, 2),
			'utf8',
			() => { },
		)
		log.info('Latest grunts saved...')
	} catch (e) {
		log.warn('Could not generate new invasions, using existing...')
	}

	// Write locales
	try {
		log.info('Creating new locales...')

		fs.mkdir('./src/util/locale', (error) => (error
			? log.info('Locale folder already exists, skipping.')
			: log.info('Locale folder created.')))

		const interested = [
			// { remote: 'characterCategories', locale: 'characterCategories' },
			// { remote: 'costumes', local: 'costumes' },
			// { remote: 'descriptions', local: 'pokemonDescriptions' },
			{ remote: 'evolutionQuests', local: 'evoQuests' },
			{ remote: 'forms', local: 'pokemonForms' },
			// { remote: 'grunts', local: 'gruntNames' },
			{ remote: 'items', local: 'itemNames' },
			// { remote: 'lures', local: 'lures' },
			// { remote: 'misc', local: 'misc' },
			{ remote: 'moves', local: 'moveNames' },
			{ remote: 'pokemon', local: 'pokemonNames' },
			// { remote: 'pokemonCategories', local: 'pokemonCategories' },
			// { remote: 'questTypes', local: 'questTypes' },
			// { remote: 'questConditions', local: 'questConditions' },
			// { remote: 'questRewardTypes', local: 'questRewardTypes' },
			{ remote: 'types', local: 'pokemonTypes' },
			{ remote: 'weather', local: 'weather' },
		]

		const availableLocales = await fetch('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/index.json')

		for (const locale of availableLocales) {
			try {
				await Promise.all(interested.map(async (category) => {
					const remoteFiles = await fetch(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/englishRef/${category.remote}_${locale}`)
					fs.writeFile(
						`./src/util/locale/${category.local}_${locale}`,
						JSON.stringify(remoteFiles, null, 2),
						'utf8',
						() => { },
					)
				}))
			} catch (e) {
				log.warn(`Could not process ${locale}`)
			}
			log.info(`${locale}`, 'file saved.')
		}
	} catch (e) {
		log.warn('Could not generate new locales, using existing...')
	}
}
