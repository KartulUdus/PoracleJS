const Fetch = require('node-fetch')
const fs = require('fs')
const util = require('./util.json')

const fetchJson = (url) => new Promise((resolve) => {
	Fetch(url)
		.then((res) => res.json())
		.then((json) => resolve(json))
})

const capital = (phrase) => phrase.split('_').map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`).join(' ')

const formatGrunts = (character) => {
	const type = capital(character.template
		.replace('CHARACTER_', '')
		.replace('EXECUTIVE_', '')
		.replace('_GRUNT', '')
		.replace('_MALE', '')
		.replace('_FEMALE', ''))
		.replace('Npc', 'NPC')
	const grunt = capital(character.template
		.replace('CHARACTER_', '')
		.replace('_MALE', '')
		.replace('_FEMALE', ''))
		.replace('Npc', 'NPC')
	return {
		type: type === 'Grunt' ? 'Mixed' : type,
		gender: character.gender ? 1 : 2,
		grunt,
	}
}

((async function generate() {
	try {
		const masterfile = await fetchJson('https://raw.githubusercontent.com/WatWowMap/Masterfile-Generator/master/master-latest.json')
		const invasions = await fetchJson('https://raw.githubusercontent.com/ccev/pogoinfo/v2/active/grunts.json')

		const newMasterfile = {
			monsters: {},
			moves: {},
			items: masterfile.items,
			questTypes: masterfile.quest_types,
			grunts: {},
		}

		Object.entries(invasions).forEach((gruntType) => {
			const [type, info] = gruntType
			const newGrunt = formatGrunts(info.character)
			if (info.active) {
				newGrunt.secondReward = info.lineup.rewards.length === 2
				newGrunt.encounters = { first: [], second: [], third: [] }
				Object.keys(newGrunt.encounters).forEach((position, i) => {
					info.lineup.team[i].forEach((pokemon) => {
						newGrunt.encounters[position].push(pokemon.id)
					})
				})
			}
			newMasterfile.grunts[type] = newGrunt
		})

		for (const [id, move] of Object.entries(masterfile.moves)) {
			if (move.proto) {
				newMasterfile.moves[id] = masterfile.moves[id]
			}
		}

		const skipForms = ['Purified', 'Shadow']
		for (const [i, pkmn] of Object.entries(masterfile.pokemon)) {
			for (const [j, form] of Object.entries(pkmn.forms)) {
				if (pkmn.pokedex_id && !skipForms.includes(form.name)) {
					const id = form.name === 'Normal' ? `${i}_0` : `${i}_${j}`
					const relevantTypes = form.types || pkmn.types

					newMasterfile.monsters[id] = {
						id: parseInt(i, 10),
						name: pkmn.name.replace(' ', '-'),
						form: {
							name: form.name,
							proto: form.proto,
							id: id.endsWith('_0') ? 0 : parseInt(j, 10),
						},
						stats: {
							baseAttack: form.attack || pkmn.attack,
							baseDefense: form.defense || pkmn.defense,
							baseStamina: form.stamina || pkmn.stamina,
						},
						types: relevantTypes.map((type) => ({ id: util.types[type].id, name: type })),
					}
				}
			}
		}

		Object.keys(newMasterfile).forEach((category) => {
			fs.writeFile(
				`./src/util/${category}.json`,
				JSON.stringify(newMasterfile[category], null, 2),
				'utf8',
				() => { },
			)
		})
	} catch (e) {
		// eslint-disable-next-line no-console
		console.warn(e, '\nUnable to generate new masterfile, using existing.')
	}
})())
