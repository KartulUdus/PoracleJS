export const state = () => ({
	sidebarOpen: false,
})


const getters = {
	sidebarOpen: state => state.sidebarOpen,
}

export const mutations = {

	toggleSidebar(state) {
		state.sidebarOpen = !state.sidebarOpen
	},

}