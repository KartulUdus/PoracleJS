/* Evolution calculations */

function setEvolutions(data, GameData, log, logReference, translator, emojiLookup, platform, monster) {
	data.hasEvolutions = monster.evolutions && monster.evolutions.length

	let totalCount = 0
	const evolutions = []
	const megaEvolutions = []

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
					})

					calcEvolutions(newMonster)
				}
			}
		}
		if (monster.tempEvolutions && monster.tempEvolutions.length) {
			for (const evo of monster.tempEvolutions) {
				const fullNameEng = translator.format(
					GameData.utilData.megaName[evo.tempEvoId],
					monster.name,
				)
				const fullName = translator.translateFormat(
					GameData.utilData.megaName[evo.tempEvoId],
					translator.translate(monster.name),
				)

				const types = evo.types ?? monster.types
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

				megaEvolutions.push({
					fullName,
					fullNameEng,
					evolution: evo.tempEvoId,
					baseStats: evo.stats,
					types,
					typeName,
					typeEmoji: emojiString,
				})
			}
		}
	}

	if (data.hasEvolutions || monster.tempEvolutions) calcEvolutions(monster)
	data.evolutions = evolutions

	data.hasMegaEvolutions = !!megaEvolutions.length
	data.megaEvolutions = megaEvolutions
}

module.exports = { setEvolutions }