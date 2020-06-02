const handlebars = require('handlebars')
const config = require('config')
const monsters = require('../util/monsters')
const { cpMultipliers, moves, types } = require('../util/util')

const Translator = require(`${__dirname}/../util/translate`)
const translator = new Translator(config.general.locale)

require('handlebars-helpers')({
	handlebars,
})

module.exports = () => {
	handlebars.registerHelper('numberFormat', (value, decimals = 2) => {
		if (Number.isNaN(+value) || Number.isNaN(+decimals)) return value
		return Number(+value).toFixed(+decimals)
	})

	handlebars.registerHelper('math', (value, decimals = 2, add = 0, remove = 0, multiply = 1, divide = 1) => {
		if (Number.isNaN(+value) || Number.isNaN(+decimals) || Number.isNaN(+add) || Number.isNaN(+remove) || Number.isNaN(+multiply) || Number.isNaN(+divide)) return value
		return Number((+value + +add - +remove) * multiply / divide).toFixed(+decimals)
	})

	handlebars.registerHelper('pad0', (value) => (value.toString().padStart(3, '0')))

	handlebars.registerHelper('moveName', (value) => (moves[value] ? translator.translate(moves[value].name) : ''))
	handlebars.registerHelper('moveType', (value) => (moves[value] ? translator.translate(moves[value].type) : ''))
	handlebars.registerHelper('moveEmoji', (value) => {
		if (!moves[value]) return ''
		return types[moves[value].type] ? translator.translate(types[moves[value].type].emoji) : ''
	})

	handlebars.registerHelper('pokemonName', (value) => {
		if (!+value) return ''
		const monster = Object.values(monsters).find((m) => m.id === +value)
		if (!monster) return ''
		return translator.translate(monster.name)
	})

	handlebars.registerHelper('pokemonName', (value) => {
		if (!+value) return ''
		const monster = Object.values(monsters).find((m) => m.id === +value)
		if (!monster) return ''
		return translator.translate(monster.name)
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

	return handlebars
}
