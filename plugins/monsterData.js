import Vue from 'vue'
import monsters from '../src/app/util/monsters'
import forms from '../src/app/util/forms'
import types from '../src/app/util/types'
import moves from '../src/app/util/moves'
import baseStats from '../src/app/util/base_stats'
import cp_multipliers from '../src/app/util/cp-multipliers'
import questDts from '../config/questdts'

import vueAwesomeCountdown from 'vue-awesome-countdown'
import { ScaleRotate } from 'vue-burger-menu';

Vue.use(vueAwesomeCountdown, 'vac')

Vue.prototype.$getMonsterData = (id) => {
	return monsters[id]
}
Vue.prototype.$getFormData = (formId) => {
	return forms[formId]
}
Vue.prototype.$getTypeData = (type) => {
	return types[type]
}
Vue.prototype.$getMoveData = (id) => {
	return moves[id]? moves[id].name : ''
}
Vue.prototype.$getBasicMonsterData = (id) => {
	let monsterTypes = monsters[id]? monsters[id].types : []
	let e = [];
	monsterTypes.forEach((type) => {
		e.push(types[type].emoji);
	});
	let typeString = ``
	monsterTypes.forEach((item, index) => {
		typeString = typeString.concat(`${item} ${e[index]} `)
	})
	return {
		name: monsters[id]? monsters[id].name : '',
		types: monsterTypes,
		typeemoji : e,
		typeString: typeString
	}
}

Vue.prototype.$getBasicQuestData = (quest) => {
	let monsterTypes = monsters[id]? monsters[id].types : []
	let e = [];
	monsterTypes.forEach((type) => {
		e.push(types[type].emoji);
	});
	let typeString = ``
	monsterTypes.forEach((item, index) => {
		typeString = typeString.concat(`${item} ${e[index]} `)
	})
	return {
		name: monsters[id]? monsters[id].name : '',
		types: monsterTypes,
		typeemoji : e,
		typeString: typeString
	}
}

Vue.prototype.$getRiadTargetCp = (id) => {

	let levels = [20, 25]
	let cps = {}
	levels.forEach(level => {
		let cp_multi = cp_multipliers[level];
		let atk = baseStats[id].attack;
		let def = baseStats[id].defense;
		let sta = baseStats[id].stamina;
		cps[level] = Math.max(10 ,Math.floor(
			(atk + 15) *
			Math.pow(def + 15, 0.5) *
			Math.pow(sta + 15, 0.5) *
			Math.pow(cp_multi, 2) /	10
		))
	})

	return cps

}
