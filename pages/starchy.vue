<template>
    <button class="menuButton" @click="handleClick">
        <img src="static/starchy.svg" height="40" width="50" />
    </button>
</template>

<script>
	import {TweenMax, Power4} from 'gsap'
	export default {
		mounted () {
			TweenMax.set(this.$el, {
				x: this.$el
			})
		},
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
		},
		watch: {
			open: function (open) {
				if(open){
					TweenMax.to(this.$el, 0.5, {css:{rotation: -90}})
				}
				else {
					TweenMax.to(this.$el, 0.5, {css:{rotation: 0}})
                }
			}
		}
	}
</script>

