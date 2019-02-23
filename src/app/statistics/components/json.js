import JsonView from '../pages/json-viewer.vue'

const install = (Vue) => {
	Vue.component('JsonViewer', JsonView)
}

export default Object.assign(JsonView, { install })