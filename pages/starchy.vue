<template>
    <button class="menuButton" @click="handleClick">
        <img src="static/starchy.svg?data" height="40" width="50" />
    </button>
</template>

<script>
	import {TweenMax, Power4} from 'gsap'
	export default {
		name: 'sidebar-toggle',
		computed: {
			open () {
				return this.$store.state.filters.sidebarOpen
			}
		},
		methods: {
			handleClick () {
				this.$store.commit('filters/toggleSidebar', {root: true} )
			}
		}
	}
</script>

<style module>
    .container{
        position: fixed;
        right: 0;
        top: 0;
    }
</style>