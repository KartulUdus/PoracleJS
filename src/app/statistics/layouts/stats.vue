<template>
    <div>
        <div id="stats">
            <no-ssr>
                <Sidebar/>
                <SidebarToggle/>
            </no-ssr>
        </div>
        <div v-on:click="toggle">
            <nuxt/>
        </div>
    </div>

</template>
<script>
	import SidebarToggle from '../pages/toggle'
	import Sidebar from '../pages/menu'
	export default {
		components: {
			SidebarToggle,
			Sidebar
		},
		computed: {
			sidebarOpen() {
				return this.$store.state.menu.sidebarOpen
			}
		},
		methods: {
			toggle() {
				if (this.sidebarOpen) this.$store.commit('menu/toggleSidebar', {root: true} )
            }
        }
	}


</script>