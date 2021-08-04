const fs = require('fs')
const { generate } = require('pogo-data-generator')
const config = require('config')

const { log } = require('../lib/logger')

module.exports.update = async function update() {
	if (config.general.fetchGameMasterOnStartup) {
		log.info('Generating latest GM...')
		try {
			const template = {
				pokemon: {
					enabled: true,
					options: {
						topLevelName: 'monsters',
						keyJoiner: '_',
						keys: {
							main: 'pokedexId formId',
						},
						customFields: {
							pokedexId: 'id',
							formId: 'id',
							pokemonName: 'name',
							formName: 'name',
							attack: 'baseAttack',
							defense: 'baseDefense',
							stamina: 'baseStamina',
							forms: 'form',
						},
						customChildObj: {
							attack: 'stats',
							defense: 'stats',
							stamina: 'stats',
						},
						skipNormalIfUnset: true,
						processFormsSeparately: true,
					},
					template: {
						pokemonName: true,
						forms: {
							formName: true,
							formId: true,
						},
						pokedexId: true,
						types: {
							typeId: true,
							typeName: true,
						},
						attack: true,
						defense: true,
						stamina: true,
					},
				},
				items: {
					enabled: true,
					options: {
						keys: {
							main: 'itemId',
						},
						customFields: {
							itemName: 'name',
						},
					},
					template: {
						itemName: true,
					},
				},
				moves: {
					enabled: true,
					options: {
						keys: {
							main: 'moveId',
						},
						customFields: {
							moveName: 'name',
						},
					},
					template: {
						moveName: true,
					},
				},
				questTypes: {
					enabled: true,
					options: {
						keys: {
							main: 'id',
						},
						customFields: {
							formatted: 'text',
						},
					},
					template: {
						formatted: true,
					},
				},
				invasions: {
					enabled: true,
					options: {
						topLevelName: 'grunts',
						keys: {
							main: 'id',
							encounters: 'position',
						},
					},
					template: {
						type: true,
						gender: true,
						grunt: true,
						secondReward: true,
						encounters: 'id',
					},
				},
			}

			const data = await generate({ template, safe: config.general.fetchSafeGameMaster })

			Object.keys(data).forEach((category) => {
				fs.writeFile(
					`./src/util/${category}.json`,
					JSON.stringify(data[category], null, 2),
					'utf8',
					() => { },
				)
			})
		} catch (e) {
			log.info('Could not fetch latest GM, using existing...')
		}
	} else {
		log.info('Skipping GM generation, make sure you have ran "npm run generate" recently to keep up with the latest updates!')
	}
}
