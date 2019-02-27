<template>
    <div class="Sidebar">
        <n-link to="/" no-prefetch><button class="button">Stats</button></n-link> <br>
        <n-link to="/pokemon" no-prefetch> <button class="button">Pokémon</button></n-link> <br>
        <n-link to="/raid" no-prefetch> <button class="button">Raids</button></n-link> <br>
        <button class="button">Quests</button> <br>
        <button class="button">Timers</button> <br>
        <button class="button">Heatmaps</button> <br>
        <n-link to="/logs" no-prefetch> <button class="button">Logs</button></n-link> <br>
    </div>
</template>

<script>
	import {TweenMax, Power4} from 'gsap'
	export default {
		name: 'sidebar',
		mounted () {
			TweenMax.set(this.$el, {
				x: -1 * this.$el.offsetWidth
			})
		},
		computed: {
			open () {
				return this.$store.state.menu.sidebarOpen
			}
		},
		watch: {
			open: function (open) {
				const dX = open ? 0 : this.$el.offsetWidth
				TweenMax.to(this.$el, 0.6, {
					x: -1 * dX,
					ease: Power4.easeOut
				})
			}
		}
	}
</script>
