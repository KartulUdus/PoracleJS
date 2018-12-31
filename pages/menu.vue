<template>
    <div class="Sidebar">
        <img src="static/starchy.svg?data"/>
    </div>
</template>

<script>
	import {TweenMax, Power4} from 'gsap'

	export default {
		name: 'sidebar',
		mounted () {
			TweenMax.set(this.$el, {
				x: this.$el.offsetWidth
			})
		},
		computed: {
			open () {
				return this.$store.state.filters.sidebarOpen
			}
		},
		watch: {
			open: function (open) {
				const dX = open ? 0 : this.$el.offsetWidth
				TweenMax.to(this.$el, 0.6, {
					x: dX,
					ease: Power4.easeOut
				})
			}
		}
	}
</script>

