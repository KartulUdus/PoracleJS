export const state = () => ({
	filter:{
		monsters: {},
		gyms: {},
		raids: {},

	},
	menuList: ['Monsters', 'Gyms', 'Raid']
})

export const mutations = {
	increment (state) {
		state.counter++
	}
}