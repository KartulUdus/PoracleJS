<template>
    <button :class="[open ? $style.active : '', $style.button]" @click="handleClick">
        <svg src="/static/starchy.svg" height="40" viewBox="0 0 40 40" width="40">
            <path d="M0 0h24v24H0z" fill="none"/>
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
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
				this.$store.dispatch('toggleSidebar')
			}
		}
	}
</script>