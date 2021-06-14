/* eslint-disable */
const Fetch = require('node-fetch')
const Fs = require('fs-extra')
const rpc = require('pogo-protos')

const utilData = require('./util')
const gameMasterFile = 'https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json'
const sourceAPK = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/'
const sourceRemote = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20Remote/'
const gruntSource = 'https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json'
const gameLanguages = ['brazilianportuguese', 'chinesetraditional', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'russian', 'spanish', 'thai']
var GameMaster,
	Form_List,
	Pokemon_List,
	Item_List,
	Quest_Types,
	Gender_List,
	Temp_Evolutions

function Fetch_Json(url) {
	return new Promise(resolve => {
		Fetch(url)
			.then(res => res.json())
			.then(json => {
				return resolve(json)
			})
	})
}

function Fetch_Txt(url) {
	return new Promise(resolve => {
		Fetch(url)
			.then(res => res.text())
			.then(text => {
				return resolve(text)
			})
	})
}

async function getLanguageData(language) {
	try {
		const rawJSONData = await Fetch_Json(sourceAPK + 'i18n_' + language + '.json')
		return rawJSONData.data
	} catch (e) {
		console.error('Unable to fetch game data for ' + language, e, data)
	}
}

async function getLanguageRemoteData(language) {
	try {
		const rawTxtData = await Fetch_Txt(sourceRemote + language.charAt(0)
			.toUpperCase() + language.slice(1) + '.txt')
		return rawTxtData
	} catch (e) {
		console.error('Unable to fetch game data for ' + language, e, data)
	}
}

function getJSONFromTxt(text) {
	const result = {}
	const filteredArray = text.split('\n')
		.filter((line) => line.includes('RESOURCE ID:') || line.includes('TEXT:'))
	filteredArray.map((item, index) => {
		if (filteredArray[index].includes('RESOURCE ID:')
			&& (filteredArray[index].includes('pokemon_name_')
				|| filteredArray[index].includes('move_name_')
				|| filteredArray[index].includes('pokemon_category_')
				|| filteredArray[index].includes('pokemon_desc_'))
			&& filteredArray[index + 1].includes('TEXT:'))
		result[filteredArray[index].replace('RESOURCE ID: ', '')] = filteredArray[index + 1].replace('TEXT: ', '')
	})
	return result
}

function capitalize(string) {
	try {
		string = string.toLowerCase()
		if (string.split('_').length > 1) {
			let processed = ''
			string.split('_')
				.forEach((word) => {
					processed += ' ' + word.charAt(0)
						.toUpperCase() + word.slice(1)
				})
			return processed.slice(1)
		} else {
			return string.charAt(0)
				.toUpperCase() + string.slice(1)
		}
	} catch (e) {
		console.error(e)
		console.error(string)
	}
}

function ensure_pokemon(pokemon_id, englishData) {
	const hasFormId = /^(\d{1,4})_(\d{1,4})?$/.exec(pokemon_id)
	const pokemonId = hasFormId ? parseInt(hasFormId[1]) : pokemon_id
	const defaultId = pokemonId + '_0'
	const pokemon_name_id_4 = 'pokemon_name_' + pokemonId.toString()
		.padStart(4, '0')
	if (!GameMaster.pokemon[defaultId]) {
		GameMaster.pokemon[defaultId] = {}
	}
	if (!GameMaster.pokemon[defaultId].name) {
		GameMaster.pokemon[defaultId].name = pokemonId === 29 ? 'Nidoran♀' : pokemonId === 32 ? 'Nidoran♂' : capitalize(Pokemon_List[pokemonId])
		if (englishData[pokemon_name_id_4]) GameMaster.pokemon[defaultId].name = englishData[pokemon_name_id_4]
	}
	if (!GameMaster.pokemon[pokemon_id]) {
		GameMaster.pokemon[pokemon_id] = {}
	}
	if (!GameMaster.pokemon[pokemon_id].name) {
		GameMaster.pokemon[pokemon_id].name = pokemonId === 29 ? 'Nidoran♀' : pokemonId === 32 ? 'Nidoran♂' : capitalize(Pokemon_List[pokemonId])
		if (englishData[pokemon_name_id_4]) GameMaster.pokemon[pokemon_id].name = englishData[pokemon_name_id_4]
	}
}

function ensure_form_name(form, pokemon_id, form_name) {
	if (!form.name) {
		form.name = capitalize(form_name.substr(Pokemon_List[pokemon_id].length + 1))
		if (pokemon_id === 29) form.name = capitalize(form_name.substr(Pokemon_List[pokemon_id].length - 6))
		if (pokemon_id === 32) form.name = capitalize(form_name.substr(Pokemon_List[pokemon_id].length - 4))
	}
}

function Lookup_Pokemon(name) {
	let pokemon_id = null
	for (const key of Object.keys(Pokemon_List)) {
		if (!key.startsWith('V') || !name.startsWith(key.substr('V9999_POKEMON_'.length) + '_') && name !== key.substr('V9999_POKEMON_'.length)) {
			continue
		}
		if (pokemon_id !== null) {
			if (pokemon_id.length > key.length) {
				continue
			}
			if (pokemon_id.length === key.length) {
				console.warn('Ambiguous form', name, pokemon_id, key)
			}
		}
		pokemon_id = key
	}
	if (pokemon_id === null) {
		//    console.warn('Unknown form', name);
	}
	return pokemon_id
}

function Generate_Forms(GameMaster, MasterArray, englishData) {
	return new Promise(async resolve => {
		for (let o = 0, len = MasterArray.length; o < len; o++) {
			let object = MasterArray[o]
			if (object.templateId.split('_')[1]) {
				let pokemon_id = Number(object.templateId.split('_')[1].slice(1))
				try {
					if (object.data.formSettings) {
						let pokemon_form_id_default = pokemon_id + '_0'
						ensure_pokemon(pokemon_form_id_default, englishData)
						let forms = object.data.formSettings.forms
						if (forms) {
							for (let f = 0, flen = forms.length; f < flen; f++) {
								let id = Form_List[object.data.formSettings.forms[f].form]
								let pokemon_form_id = pokemon_id + '_' + id
								ensure_pokemon(pokemon_form_id, englishData)
								if (f === 0) {
									GameMaster.pokemon[pokemon_form_id].default_form = true
									if (!GameMaster.pokemon[pokemon_form_id_default].form) {
										GameMaster.pokemon[pokemon_form_id_default].form = { name: '' }
									}
									if (!GameMaster.pokemon[pokemon_form_id_default].form.id) {
										GameMaster.pokemon[pokemon_form_id_default].form.id = 0
									}
								}
								if (!GameMaster.pokemon[pokemon_form_id].form) {
									GameMaster.pokemon[pokemon_form_id].form = {}
								}
								ensure_form_name(GameMaster.pokemon[pokemon_form_id].form, pokemon_id, forms[f].form)
								if (!GameMaster.pokemon[pokemon_form_id].form.proto) {
									GameMaster.pokemon[pokemon_form_id].form.proto = object.data.formSettings.forms[f].form
								}
								if (!GameMaster.pokemon[pokemon_form_id].form.id) {
									GameMaster.pokemon[pokemon_form_id].form.id = id
								}
							}
						} else {
							if (!GameMaster.pokemon[pokemon_form_id_default].form) {
								GameMaster.pokemon[pokemon_form_id_default].form = {
									name: 'Normal',
									proto: '',
									id: 0
								}
							}
						}
					}
				} catch (e) {
					console.error(e)
					console.error(object)
				}
			}
		}
		return resolve(GameMaster)
	})
}

function Compile_Data(GameMaster, MasterArray, englishData) {
	return new Promise(async resolve => {
		for (let o = 0, len = MasterArray.length; o < len; o++) {
			let object = MasterArray[o]
			try {
				if (object.data.pokemonSettings) {
					let pokemon_id = Number(object.templateId.split('_')[0].slice(1))
					let pokemon_id_default = pokemon_id + '_0'
					ensure_pokemon(pokemon_id_default, englishData)
					let Pokemon = GameMaster.pokemon[pokemon_id_default]
					let form_id = null
					if (/^V\d{4}_POKEMON_/.test(object.templateId)) {
						form_id = Form_List[object.templateId.substr('V9999_POKEMON_'.length)]
					}
					if (form_id) {
						let pokemon_form_id = pokemon_id + '_' + form_id
						if (!GameMaster.pokemon[pokemon_form_id]) {
							GameMaster.pokemon[pokemon_form_id] = {}
						}
						let Form = GameMaster.pokemon[pokemon_form_id]
						Form.id = pokemon_id
						Form.stats = {}
						Form.stats.baseAttack = object.data.pokemonSettings.stats.baseAttack
						Form.stats.baseDefense = object.data.pokemonSettings.stats.baseDefense
						Form.stats.baseStamina = object.data.pokemonSettings.stats.baseStamina
						Form.types = []
						if (object.data.pokemonSettings.type) {
							const type1name = capitalize(object.data.pokemonSettings.type.replace('POKEMON_TYPE_', ''))
							Form.types.push({
								id: utilData.types[type1name].id,
								name: type1name
							})
						}
						if (object.data.pokemonSettings.type2) {
							const type2name = capitalize(object.data.pokemonSettings.type2.replace('POKEMON_TYPE_', ''))
							Form.types.push({
								id: utilData.types[type2name].id,
								name: type2name
							})
						}
					} else {
						Pokemon.id = pokemon_id
						Pokemon.stats = {}
						Pokemon.stats.baseAttack = object.data.pokemonSettings.stats.baseAttack
						Pokemon.stats.baseDefense = object.data.pokemonSettings.stats.baseDefense
						Pokemon.stats.baseStamina = object.data.pokemonSettings.stats.baseStamina
						Pokemon.types = []
						if (object.data.pokemonSettings.type) {
							const type1name = capitalize(object.data.pokemonSettings.type.replace('POKEMON_TYPE_', ''))
							Pokemon.types.push({
								id: utilData.types[type1name].id,
								name: type1name
							})
						}
						if (object.data.pokemonSettings.type2) {
							const type2name = capitalize(object.data.pokemonSettings.type2.replace('POKEMON_TYPE_', ''))
							Pokemon.types.push({
								id: utilData.types[type2name].id,
								name: type2name
							})
						}
					}
				} else if (object.data.itemSettings) {
					let item_name = ''
					object.data.itemSettings.itemId.split('_')
						.splice(1)
						.forEach((word) => {
							item_name += ' ' + capitalize(word)
						})
					let item_name_eng_key = object.data.itemSettings.itemId.toLowerCase() + '_name'
					const englishAPKDataItems = {}
					const englishData = await getLanguageData('english')
					Object.keys(englishData)
						.map((index, item) => {
							if (englishData[item].includes('item_') && englishData[item].includes('_name')) {
								englishAPKDataItems[englishData[item]] = englishData[parseInt(index, 10) + 1]
							}
						})
					let englishRemoteData = await getLanguageRemoteData('english')
					englishRemoteData = getJSONFromTxt(englishRemoteData)
					const englishDataItems = { ...englishAPKDataItems, ...englishRemoteData }
					let item_id = Item_List[object.data.itemSettings.itemId]
					if (!GameMaster.items[item_id]) {
						GameMaster.items[item_id] = {}
					}
					GameMaster.items[item_id].name = item_name.slice(1)
					if (englishDataItems[item_name_eng_key]) GameMaster.items[item_id].name = englishDataItems[item_name_eng_key]
					GameMaster.items[item_id].proto = object.data.itemSettings.itemId
					GameMaster.items[item_id].type = capitalize(object.data.itemSettings.itemType.replace('ITEM_TYPE_', ''))
					GameMaster.items[item_id].category = capitalize(object.data.itemSettings.category.replace('ITEM_CATEGORY_', ''))
					if (object.data.itemSettings.dropTrainerLevel && object.data.itemSettings.dropTrainerLevel < 60) {
						GameMaster.items[item_id].min_trainer_level = object.data.itemSettings.dropTrainerLevel
					}
				} else if (object.data.combatMove) {
					let move_id = Move_List[object.data.templateId.substr(18)]
					let move_name_id_4 = 'move_name_' + move_id.toString()
						.padStart(4, '0')
					if (!GameMaster.moves[move_id]) {
						GameMaster.moves[move_id] = {}
					}
					let Move = GameMaster.moves[move_id]
					Move.name = capitalize(object.data.combatMove.uniqueId.replace('_FAST', ''))
					Move.name = englishData[move_name_id_4]
					Move.proto = object.templateId.substr(18)
					Move.type = capitalize(object.data.combatMove.type.replace('POKEMON_TYPE_', ''))
					Move.power = object.data.combatMove.power
				}
			} catch (e) {
				console.error(e)
				console.error(object)
			}
		}

		// END
		return resolve(GameMaster)
	})
}

function Add_Missing_Pokemon() {
	// add missing data for Unown forms
	for (let i = 1; i < 29; i++) {
		const currentUnown = '201_' + i
		GameMaster.pokemon[currentUnown].id = GameMaster.pokemon['201_0'].id
		GameMaster.pokemon[currentUnown].stats = GameMaster.pokemon['201_0'].stats
		GameMaster.pokemon[currentUnown].types = GameMaster.pokemon['201_0'].types
	}
	// add missing data for Spinda forms
	for (let i = 37; i < 45; i++) {
		const currentSpinda = '327_' + i
		GameMaster.pokemon[currentSpinda].id = GameMaster.pokemon['327_0'].id
		GameMaster.pokemon[currentSpinda].stats = GameMaster.pokemon['327_0'].stats
		GameMaster.pokemon[currentSpinda].types = GameMaster.pokemon['327_0'].types
	}
	for (let i = 121; i < 133; i++) {
		const currentSpinda = '327_' + i
		GameMaster.pokemon[currentSpinda].id = GameMaster.pokemon['327_0'].id
		GameMaster.pokemon[currentSpinda].stats = GameMaster.pokemon['327_0'].stats
		GameMaster.pokemon[currentSpinda].types = GameMaster.pokemon['327_0'].types
	}
	// Remove missing Diancie and Volcanion
	delete GameMaster.pokemon['719_0']
	delete GameMaster.pokemon['721_0']
	// set proper form name for Armored Mewtwo
	if (GameMaster.pokemon['150_133'].form.name === "A") GameMaster.pokemon['150_133'].form.name = "Armored"
}

(async function () {
	const englishAPKData = {}
	const englishLanguageData = await getLanguageData('english')
	Object.keys(englishLanguageData)
		.map((index, item) => {
			if (englishLanguageData[item].includes('pokemon_name_')
				|| englishLanguageData[item].includes('move_name_')
				|| englishLanguageData[item].includes('pokemon_desc_')
				|| englishLanguageData[item].includes('pokemon_category_')) {
				englishAPKData[englishLanguageData[item]] = englishLanguageData[parseInt(index, 10) + 1]
			}
		})
	let englishRemoteData = await getLanguageRemoteData('english')
	englishRemoteData = getJSONFromTxt(englishRemoteData)
	const englishData = { ...englishAPKData, ...englishRemoteData }
	// Force Sirfetchd
	englishData['pokemon_name_0865'] = 'Sirfetchd'
	const supportedLanguages = utilData.languageNames
	for (const lang of Object.keys(supportedLanguages)) {
		const currentLanguage = supportedLanguages[lang]
		if (!gameLanguages.includes(currentLanguage)) {
			console.log(currentLanguage + ' does not exist in Game data')
			continue
		}
		let currentRawData = ''
		console.log('Computing ' + currentLanguage)
		try {
			currentRawData = await getLanguageData(currentLanguage)
		} catch (e) {
			currentRawData = null
		}
		if (!currentRawData) {
			console.log('Unable to fetch game data for ' + currentLanguage)
		} else {
			console.log('Fetched game translations for ' + currentLanguage)
			const currentAPKData = {}
			Object.keys(currentRawData)
				.map((index, item) => {
					if (currentRawData[item].includes('pokemon_name_')
						|| currentRawData[item].includes('move_name_')
						|| currentRawData[item].includes('pokemon_category_')
						|| currentRawData[item].includes('pokemon_desc_')) {
						currentAPKData[currentRawData[item]] = currentRawData[parseInt(index, 10) + 1]
					}
				})
			let currentRemoteData = await getLanguageRemoteData(currentLanguage)
			currentRemoteData = getJSONFromTxt(currentRemoteData)
			const currentData = { ...currentAPKData, ...currentRemoteData }
			let currentPokemonNames = {}
			let currentMoveNames = {}
			let currentPokemonCategories = {}
			let currentPokemonDescriptions = {}
			for (const item of Object.keys(englishData)) {
				if (item.includes('pokemon_name_')) {
					currentPokemonNames[englishData[item]] = currentData[item]
				}
				if (item.includes('move_name_')) {
					currentMoveNames[englishData[item]] = currentData[item]
				}
				if (item.includes('pokemon_category_')) {
					currentPokemonCategories[englishData[item]] = currentData[item]
				}
				if (item.includes('pokemon_desc_')) {
					currentPokemonDescriptions[englishData[item]] = currentData[item]
				}
			}
			Fs.writeJSONSync('./locale/pokemonNames_' + lang + '.json', currentPokemonNames, {
				spaces: '\t',
				EOL: '\n'
			})
			Fs.writeJSONSync('./locale/moveNames_' + lang + '.json', currentMoveNames, {
				spaces: '\t',
				EOL: '\n'
			})
			Fs.writeJSONSync('./locale/pokemonCategories_' + lang + '.json', currentPokemonCategories, {
				spaces: '\t',
				EOL: '\n'
			})
			Fs.writeJSONSync('./locale/pokemonDescriptions_' + lang + '.json', currentPokemonDescriptions, {
				spaces: '\t',
				EOL: '\n'
			})
			console.log('Translation files saved for ' + currentLanguage)
		}
		Fs.writeJSONSync('./locale/englishData.json', englishData, {
			spaces: '\t',
			EOL: '\n'
		})
		console.log('English Game data file saved')
	}

	console.log('Getting Grunt list update')
	const gruntData = await Fetch_Json(gruntSource)
	const updatedGruntData = {}
	for (const gruntId of Object.keys(gruntData)) {
		let type = gruntData[gruntId].character.type.name ? gruntData[gruntId].character.type.name : gruntData[gruntId].character.template
		updatedGruntData[gruntId] = {
			type: capitalize(type.replace('CHARACTER_', '').replace('EXECUTIVE_', '').replace('_MALE', '')
				.replace('_FEMALE', '').replace('_GRUNT', '')),
			gender: gruntData[gruntId].character.gender === 0 ? 2 : gruntData[gruntId].character.gender === 1 ? 1 : '',
			grunt: capitalize(gruntData[gruntId].character.template.replace('CHARACTER_', '')
				.replace('_MALE', '')
				.replace('_FEMALE', '')),
		}
		if (updatedGruntData[gruntId].type === "Grunt") updatedGruntData[gruntId].type = "Mixed"
		if (gruntData[gruntId].lineup) {
			updatedGruntData[gruntId].second_reward = !!(gruntData[gruntId].lineup && gruntData[gruntId].lineup.rewards.length > 1)
			updatedGruntData[gruntId].encounters = {
				first: Object.keys(gruntData[gruntId].lineup.team[0])
					.map((pok) => gruntData[gruntId].lineup.team[0][pok].id).filter((e) => e != null),
				second: Object.keys(gruntData[gruntId].lineup.team[1])
					.map((pok) => gruntData[gruntId].lineup.team[1][pok].id).filter((e) => e != null),
				third: Object.keys(gruntData[gruntId].lineup.team[2])
					.map((pok) => gruntData[gruntId].lineup.team[2][pok].id).filter((e) => e != null),
			}
		}
	}
	Fs.writeJSONSync('./newGrunts.json', updatedGruntData, {
		spaces: '\t',
		EOL: '\n'
	})
	console.log('Updated grunt list file saved')

	Move_List = rpc.Rpc.HoloPokemonMove
	Form_List = rpc.Rpc.PokemonDisplayProto.Form
	Pokemon_List = rpc.Rpc.HoloPokemonId
	Quest_Types = rpc.Rpc.QuestType
	Item_List = rpc.Rpc.Item
	Gender_List = rpc.Rpc.PokemonDisplayProto.Gender
	Temp_Evolutions = rpc.Rpc.HoloTemporaryEvolutionId

	GameMaster = {}

	let MasterArray = await Fetch_Json(gameMasterFile)

	GameMaster.pokemon = {}
	GameMaster.moves = {}
	GameMaster.items = {}
	GameMaster = await Generate_Forms(GameMaster, MasterArray, englishData)
	GameMaster = await Compile_Data(GameMaster, MasterArray, englishData)
	Add_Missing_Pokemon()
	Fs.writeJSONSync('newMonsters.json', GameMaster.pokemon, {
		spaces: '\t',
		EOL: '\n'
	})
	console.log('newMonsters.json saved')
	Fs.writeJSONSync('newMoves.json', GameMaster.moves, {
		spaces: '\t',
		EOL: '\n'
	})
	console.log('newMoves.json saved')
	Fs.writeJSONSync('newItems.json', GameMaster.items, {
		spaces: '\t',
		EOL: '\n'
	})
	console.log('newItems.json saved')
})()
