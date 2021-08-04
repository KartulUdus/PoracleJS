/* eslint-disable */
const Fetch = require('node-fetch')
const Fs = require('fs-extra')

const utilData = require('./util')
const sourceAPK = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/'
const sourceRemote = 'https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20Remote/'
const gameLanguages = ['brazilianportuguese', 'chinesetraditional', 'english', 'french', 'german', 'italian', 'japanese', 'korean', 'russian', 'spanish', 'thai']

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
})()
