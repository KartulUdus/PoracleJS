/* Evolution calculations */

function setEvolutions(data, GameData, log, logReference, translator, emojiLookup, platform, monster) {
    data.hasEvolutions = monster.evolutions && monster.evolutions.length

    let totalCount = 0
    const evolutions = []
    const previousEvolutions = []
    // Check if mon has a previousEvolution
    const previousEvo = Object.values(GameData.monsters).filter((mon) => {
            return mon.evolutions && mon.evolutions.some((evo) => evo.evoId === monster.id && mon.form.id === 0)
    })

    // eslint-disable-next-line no-shadow
    const calcEvolutions = (monster) => {
            if (++totalCount >= 10) {
                    log.error(`${logReference}: Too many possible evolutions ${monster.id}_${monster.form.id}`)
                    return
            }

            if (monster.evolutions && monster.evolutions.length) {
                    for (const evo of monster.evolutions) {
                            const newMonster = GameData.monsters[`${evo.evoId}_${evo.id}`]

                            if (newMonster) {
                                    const { types } = newMonster
                                    // eslint-disable-next-line no-shadow
                                    const e = []
                                    // eslint-disable-next-line no-shadow
                                    const n = []

                                    types.forEach((type) => {
                                            e.push(translator.translate(emojiLookup.lookup(GameData.utilData.types[type.name].emoji, platform)))
                                            n.push(type.name)
                                    })

                                    const typeName = n.map((type) => translator.translate(type))
                                            .join(', ')
                                    const emojiString = e.join('')

                                    const nameEng = newMonster.name
                                    const name = translator.translate(nameEng)
                                    const formNameEng = newMonster.form.name
                                    const formNormalisedEng = formNameEng === 'Normal' ? '' : formNameEng
                                    const formNormalised = translator.translate(formNormalisedEng)

                                    const fullNameEng = nameEng.concat(formNormalisedEng ? ' ' : '', formNormalisedEng)
                                    const fullName = name.concat(formNormalised ? ' ' : '', formNormalised)

                                    evolutions.push({
                                            id: evo.evoId,
                                            form: evo.id,
                                            fullName,
                                            fullNameEng,
                                            formNormalised,
                                            formNormalisedEng,
                                            name,
                                            nameEng,
                                            formNameEng,
                                            typeName,
                                            typeEmoji: emojiString,
                                            baseStats: newMonster.stats,
                                            candyCost: evo.candyCost
                                    })

                                    calcEvolutions(newMonster)
                            }
                    }
            }
    }
    // eslint-disable-next-line no-shadow
    const calcDevolutions = (monster) => {
            if (++totalCount >= 5) {
                    log.error(`${logReference}: Too many possible devolutions ${monster.id}_${monster.form.id}`)
                    return
            }
            const newMonster = GameData.monsters[`${monster.id}_${monster.form.id || 0}`]

            if (newMonster) {
                    const { types } = newMonster
                    // eslint-disable-next-line no-shadow
                    const e = []
                    // eslint-disable-next-line no-shadow
                    const n = []

                    types.forEach((type) => {
                            e.push(translator.translate(emojiLookup.lookup(GameData.utilData.types[type.name].emoji, platform)))
                            n.push(type.name)
                    })

                    const typeName = n.map((type) => translator.translate(type))
                            .join(', ')
                    const emojiString = e.join('')

                    const nameEng = newMonster.name
                    const name = translator.translate(nameEng)
                    const formNameEng = newMonster.form.name
                    const formNormalisedEng = formNameEng === 'Normal' ? '' : formNameEng
                    const formNormalised = translator.translate(formNormalisedEng)

                    const fullNameEng = nameEng.concat(formNormalisedEng ? ' ' : '', formNormalisedEng)
                    const fullName = name.concat(formNormalised ? ' ' : '', formNormalised)

                    previousEvolutions.push({
                            id: monster.id,
                            form: monster.form.id,
                            fullName,
                            fullNameEng,
                            formNormalised,
                            formNormalisedEng,
                            name,
                            nameEng,
                            formNameEng,
                            typeName,
                            typeEmoji: emojiString,
                            baseStats: newMonster.stats,
                            candyCost: newMonster.evolutions[0].candyCost // Evolutions is a nested object
                    })
                    // Check if there is another devolution
                    const nextMonster = Object.values(GameData.monsters).filter((mon) => {
                            return mon.evolutions && mon.evolutions.some((evo) => evo.evoId === newMonster.id && mon.form.id === 0)
                    })
                    if (nextMonster && nextMonster.length) calcDevolutions(nextMonster[0])
            }
    }

    if (data.hasEvolutions) calcEvolutions(monster)
    if (previousEvo && previousEvo.length) calcDevolutions(previousEvo[0])
    data.evolutions = evolutions

    data.hasPreviousEvolutions = !!previousEvolutions.length
    data.previousEvolutions = previousEvolutions
}

module.exports = { setEvolutions }