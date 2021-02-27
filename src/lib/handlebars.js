const handlebars = require('handlebars')
const config = require('config')
const monsters = require('../util/monsters')
const {
	cpMultipliers, types, powerUpCost,
} = require('../util/util')
const moves = require('../util/moves')

const TranslatorFactory = require('../util/translatorFactory')

const translatorFactory = new TranslatorFactory(config)

require('handlebars-helpers')({
	handlebars,
})

function userTranslator(options) {
	return options.data.language ? translatorFactory.Translator(options.data.language) : translatorFactory.default
}

function translatorAlt() {
	return translatorFactory.AltTranslator
}

module.exports = () => {
	handlebars.registerHelper('numberFormat', (value, decimals = 2) => {
		if (Number.isNaN(+value) || Number.isNaN(+decimals)) return value
		return Number(+value).toFixed(+decimals)
	})

	handlebars.registerHelper('math', (value, decimals = 2, add = 0, remove = 0, multiply = 1, divide = 1) => {
		if (Number.isNaN(+value) || Number.isNaN(+decimals) || Number.isNaN(+add) || Number.isNaN(+remove) || Number.isNaN(+multiply) || Number.isNaN(+divide)) return value
		return Number((+value + +add - +remove) * multiply / divide).toFixed(+decimals)
	})

	handlebars.registerHelper('pad0', (value, padTo = 3) => (value.toString().padStart(padTo, '0')))

	handlebars.registerHelper('moveName', (value, options) => (moves[value] ? userTranslator(options).translate(moves[value].name) : ''))
	handlebars.registerHelper('moveNameAlt', (value) => (moves[value] ? translatorAlt().translate(moves[value].name) : ''))
	handlebars.registerHelper('moveType', (value, options) => (moves[value] ? userTranslator(options).translate(moves[value].type) : ''))
	handlebars.registerHelper('moveTypeAlt', (value) => (moves[value] ? translatorAlt().translate(moves[value].type) : ''))
	handlebars.registerHelper('moveEmoji', (value, options) => {
		if (!moves[value]) return ''
		return types[moves[value].type] ? userTranslator(options).translate(types[moves[value].type].emoji) : ''
	})
	handlebars.registerHelper('moveEmojiAlt', (value) => {
		if (!moves[value]) return ''
		return types[moves[value].type] ? translatorAlt.translate(types[moves[value].type].emoji) : ''
	})

	handlebars.registerHelper('pokemonName', (value, options) => {
		if (!+value) return ''
		const monster = Object.values(monsters).find((m) => m.id === +value)
		if (!monster) return ''
		return userTranslator(options).translate(monster.name)
	})

	handlebars.registerHelper('pokemonNameAlt', (value) => {
		if (!+value) return ''
		const monster = Object.values(monsters).find((m) => m.id === +value)
		if (!monster) return ''
		return translatorAlt().translate(monster.name)
	})

	handlebars.registerHelper('pokemonForm', (value, options) => {
		if (!+value) return ''
		const monster = Object.values(monsters).find((m) => m.form.id === +value)
		if (!monster) return ''
		return userTranslator(options).translate(monster.form.name)
	})

	handlebars.registerHelper('pokemonFormAlt', (value) => {
		if (!+value) return ''
		const monster = Object.values(monsters).find((m) => m.form.id === +value)
		if (!monster) return ''
		return translatorAlt().translate(monster.form.name)
	})

	handlebars.registerHelper('translateAlt', (value) => {
		if (!value) return ''
		return translatorAlt().translate(value)
	})

	handlebars.registerHelper('calculateCp', (baseStats, level = 25, ivAttack = 15, ivDefense = 15, ivStamina = 15) => {
		if (!baseStats) return 0
		const cpMulti = cpMultipliers[level]
		const atk = baseStats.baseAttack
		const def = baseStats.baseDefense
		const sta = baseStats.baseStamina

		return Math.max(10, Math.floor(
			(atk + +ivAttack)
              * (def + +ivDefense) ** 0.5
              * (sta + +ivStamina) ** 0.5
              * cpMulti ** 2
              / 10,
		))
	})

	handlebars.registerHelper('getPowerUpCost', (levelStart, levelEnd, options) => {
		const translator = userTranslator(options)

		if (!levelStart || !levelEnd) return ''
		let stardustCost = 0
		let candyCost = 0
		let xlCandyCost = 0
		let returnString = ''
		for (const level in powerUpCost) {
			if (level >= levelStart && level < levelEnd) {
				stardustCost += powerUpCost[level].stardust
				if (powerUpCost[level].candy) candyCost += powerUpCost[level].candy
				if (powerUpCost[level].xlCandy) xlCandyCost += powerUpCost[level].xlCandy
			}
		}
		if (options.fn) {
			return options.fn({
				stardust: stardustCost,
				candy: candyCost,
				xlCandy: xlCandyCost,
			})
		}

		if (stardustCost) returnString = `${stardustCost.toLocaleString(config.locale.timeformat)} ${translator.translate('Stardust')}`
		if (candyCost) returnString = returnString.concat(` and ${candyCost} ${translator.translate('Candies')}`)
		if (xlCandyCost) returnString = returnString.concat(` and ${xlCandyCost} ${translator.translate('XL Candies')}`)
		return returnString
	})

	handlebars.registerHelper('map', (name, value, options) => {
		const r = require('./customMap')

		let f = r.find((x) => (x.name === name && x.language === options.data.language))
		if (!f) {
			f = r.find((x) => (x.name === name))
		}

		if (options.fn) {
			return options.fn(f.map[value])
		}

		return f.map[value]
	})

	return handlebars
}
