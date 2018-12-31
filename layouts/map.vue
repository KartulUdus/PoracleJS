<template>
    <div>
        <div id="menu">
            <no-ssr>
                <Sidebar/>
                <SidebarToggle/>
            </no-ssr>
        </div>
        <nuxt/>
    </div>

</template>
<script>

	import SidebarToggle from '../pages/starchy'
	import Sidebar from '../pages/menu'
	export default {
		components: { SidebarToggle, Sidebar }
	}


</script>
