import Vue from 'vue'
import monsters from '../src/app/util/monsters'
import forms from '../src/app/util/forms'
import types from '../src/app/util/types'
import moves from '../src/app/util/moves'

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
	return moves[id].name
}
Vue.prototype.$getBasicMonsterData = (id) => {
	let monsterTypes = monsters[id].types
	let e = [];
	monsters[id].types.forEach((type) => {
		e.push(types[type].emoji);
	});
	let typeString = ``
	monsterTypes.forEach((item, index) => {
		typeString = typeString.concat(`${item} ${e[index]} `)
	})
	return {
		name: monsters[id].name,
		types: monsterTypes,
		typeemoji : e,
		typeString: typeString
	}
}
