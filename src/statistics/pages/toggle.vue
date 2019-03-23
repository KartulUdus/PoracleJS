<template>
    <button class="toggleButton" @click="handleClick">
        <img src="~/assets/menu.svg" height="100%" width="100%" />
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
				return this.$store.state.menu.sidebarOpen
			}
		},
		methods: {
			handleClick () {
				this.$store.commit('menu/toggleSidebar', {root: true} )
			}
		},
		watch: {
			open: function (open) {
				if(open){
					TweenMax.to(this.$el, 0.5, {css:{rotation: 90}})
				}
				else {
					TweenMax.to(this.$el, 0.5, {css:{rotation: 0}})
				}
			}
		}
	}
</script>