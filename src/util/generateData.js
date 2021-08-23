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
	try {
		log.info('Fetching latest Game Master...')
		const gameMaster = await fetch('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest-poracle.json')

		// Write monsters/moves/items/questTypes
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

	try {
		log.info('Fetching latest invasions and locales...')
		const { translations, invasions } = await generate({
			template: {
				globalOptions: {
					includeProtos: true,
				},
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
						id: false,
						type: true,
						gender: true,
						grunt: true,
						secondReward: true,
						encounters: 'id',
					},
				},
				translations: {
					enabled: true,
					options: {
						useLanguageAsRef: 'en',
						manualTranslations: true,
						prefix: {},
					},
					locales: {
						de: true,
						en: true,
						es: true,
						fr: true,
						it: true,
						ja: true,
						ko: true,
						'pt-br': true,
						ru: true,
						th: true,
						'zh-tw': true,
					},
					template: {
						pokemon: {
							names: true,
							forms: true,
							descriptions: true,
						},
						moves: true,
						items: true,
						types: true,
						characters: true,
						weather: true,
						misc: true,
						pokemonCategories: true,
						quests: true,
					},
				},
			},
		})

		// Write locales
		log.info('Creating new locales...')
		Object.keys(translations).forEach((locale) => {
			Object.keys(translations[locale]).forEach((category) => {
				let name
				switch (category) {
					case 'descriptions': name = 'pokemonDescriptions'; break
					case 'pokemonCategories': name = 'pokemonCategories'; break
					case 'moves': name = 'moveNames'; break
					case 'pokemon': name = 'pokemonNames'; break
					default: break
				}
				if (name) {
					fs.writeFile(
						`./src/util/locale/${name}_${locale}.json`,
						JSON.stringify(translations[locale][category], null, 2),
						'utf8',
						() => { },
					)
				}
			})
		})

		// Write grunts
		log.info('Creating new grunts...')
		fs.writeFile(
			'./src/util/grunts.json',
			JSON.stringify(invasions, null, 2),
			'utf8',
			() => { },
		)
	} catch (e) {
		log.info('Could not generate new locales, using existing...')
	}
}
