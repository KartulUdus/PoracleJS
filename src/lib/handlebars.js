const handlebars = require('handlebars')
const { cpMultipliers } = require('../util/util')

module.exports = () => {
    handlebars.registerHelper('numberFormat', (value, decimals = 2) => {
        if (isNaN(+value) || isNaN(+decimals)) return value
        return Number(+value).toFixed(+decimals)
    })

    handlebars.registerHelper('math', (value, decimals = 2, add = 0, remove = 0, multiply = 1, divide = 1) => {
        if (isNaN(+value) || isNaN(+decimals) || isNaN(+add) || isNaN(+remove) || isNaN(+multiply) || isNaN(+divide)) return value
        return Number((+value + +add - +remove) * multiply / divide).toFixed(+decimals)
    })

    handlebars.registerHelper('equal', (value, comparable) => {
        return value === comparable ? true : false
    })

    handlebars.registerHelper('bigger', (value, comparable) => {
        return value > comparable ? true : false
    })

    handlebars.registerHelper('smaller', (value, comparable) => {
        return value < comparable ? true : false
    })

    handlebars.registerHelper('calculateCp', (value, baseStats, level = 25, ivAttack = 15, ivDefense = 15 , ivStamina = 15) => {
        if (!baseStats) return 0
        const cp_multi = cpMultipliers[level]
        const atk = baseStats.baseAttack
        const def = baseStats.baseDefense
        const sta = baseStats.baseStamina
    
        return Math.max(10, Math.floor(
                (atk + +ivAttack)
              * (def + +ivDefense) ** 0.5
              * (sta + +ivStamina) ** 0.5
              * cp_multi **  2
              / 10
        ))
    })

    return handlebars
}