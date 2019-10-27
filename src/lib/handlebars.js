const handlebars = require('handlebars')
const { cpMultipliers } = require('../util/util')

module.exports = () => {
	handlebars.registerHelper('numberFormat', (value, decimals = 2) => {
		if (Number.isNaN(+value) || Number.isNaN(+decimals)) return value
		return Number(+value).toFixed(+decimals)
	})

	handlebars.registerHelper('math', (value, decimals = 2, add = 0, remove = 0, multiply = 1, divide = 1) => {
		if (Number.isNaN(+value) || Number.isNaN(+decimals) || Number.isNaN(+add) || Number.isNaN(+remove) || Number.isNaN(+multiply) || Number.isNaN(+divide)) return value
		return Number((+value + +add - +remove) * multiply / divide).toFixed(+decimals)
	})

	handlebars.registerHelper('equal', (value, comparable) => (value === comparable))

	handlebars.registerHelper('bigger', (value, comparable) => (value > comparable))

	handlebars.registerHelper('smaller', (value, comparable) => (value < comparable))

	handlebars.registerHelper('calculateCp', (value, baseStats, level = 25, ivAttack = 15, ivDefense = 15, ivStamina = 15) => {
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