
export const state = () => ({
	pokemon: {
		enabled: true
	},
	raid: {
		enabled:true
	},
	gym: {
		enabled:true
	},
	sidebarOpen: false
})



const getters = {
	sidebarOpen: state => state.sidebarOpen
}

export const mutations = {

	toggleSidebar (state) {
		state.sidebarOpen = !state.sidebarOpen
	}

}