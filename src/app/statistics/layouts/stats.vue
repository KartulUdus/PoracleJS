<template>
    <div>
        <div id="stats">
            <no-ssr>
                <Sidebar/>
                <SidebarToggle/>
            </no-ssr>
        </div>
        <nuxt/>
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
		}
	}


</script>