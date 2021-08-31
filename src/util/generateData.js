const fs = require('fs')
const { generate } = require('pogo-data-generator')
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
		const { invasions } = await generate({
			template: {
				invasions: {
					enabled: true,
					options: {
						topLevelName: 'invasions',
						keys: {
							main: 'id',
							encounters: 'position',
						},
						includeBalloons: true,
						customFields: {
							first: 'first',
							second: 'second',
							third: 'third',
						},
						placeholderData: true,
					},
					template: {
						type: true,
						gender: true,
						grunt: true,
						secondReward: true,
						encounters: 'id',
					},
				},
			},
		})
		fs.writeFile(
			'./src/util/grunts.json',
			JSON.stringify(invasions, null, 2),
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

		const available = await fetch('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/index.json')

		const englishRef = await fetch('https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/locales/en.json')

		fs.mkdir('./src/util/locale', (error) => (error
			? log.info('Locale folder already exists, skipping.')
			: log.info('Locale folder created.')))

		await Promise.all(available.map(async (locale) => {
			try {
				const trimmed = {
					pokemonNames: { },
					pokemonCategories: { },
					pokemonDescriptions: { },
					moveNames: { },
				}
				const remoteFiles = await fetch(`https://raw.githubusercontent.com/WatWowMap/pogo-translations/master/static/locales/${locale}`)

				Object.keys(remoteFiles).forEach((key) => {
					if (key.startsWith('poke_')) {
						trimmed.pokemonNames[englishRef[key]] = remoteFiles[key]
					} else if (key.startsWith('move_')) {
						trimmed.moveNames[englishRef[key]] = remoteFiles[key]
					} else if (key.startsWith('desc_')) {
						trimmed.pokemonDescriptions[englishRef[key]] = remoteFiles[key]
					} else if (key.startsWith('pokemon_category_')) {
						trimmed.pokemonCategories[englishRef[key]] = remoteFiles[key]
					}
				})
				Object.keys(trimmed).forEach((category) => {
					fs.writeFile(
						`./src/util/locale/${category}_${locale}`,
						JSON.stringify(trimmed[category], null, 2),
						'utf8',
						() => { },
					)
				})
				log.info(`${locale}`, 'file saved.')
			} catch (e) {
				log.warn(e, '\n', locale)
			}
		}))
	} catch (e) {
		log.warn('Could not generate new locales, using existing...')
	}
}
