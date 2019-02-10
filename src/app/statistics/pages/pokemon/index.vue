<template>
    <div class="line-chart">
        <no-ssr>
            <div class="topbuttons">
                <p class="title"> <img class="title" src="~/assets/starchy.svg" height="50" width="66" />PoracleJS Pokémon Stats</p>
                <button class="button" v-on:click="timeTarget = 300000; updateAll()">5m</button>
                <button class="button" v-on:click="timeTarget = 900000; updateAll()">15m</button>
                <button class="button" v-on:click="timeTarget = 1800000; updateAll()">30m</button>
                <button class="button" v-on:click="timeTarget = 3600000; updateAll()">1h</button>
                <button class="button" v-on:click="timeTarget = 10800000; updateAll()">3h</button>
                <button class="button" v-on:click="timeTarget = 32400000; updateAll()">9h</button>
            </div>
        </no-ssr>
    </div>
</template>

<script>
	import lineChart from '~/components/lineChart'
	import Doughnut from '~/components/doughnutChart'

	export default {
		name: 'statistics',
		layout: 'stats',
		data() {
			return {
				timeTarget: 300000
			}
		},

		components: {
			lineChart,
			Doughnut
		},
		computed: {
			pokemonData () { return this.$store.state.pokemon.data },

		},

		methods: {
			updateAll() {
				this.$store.commit('pokemon/createData', this.timeTarget)
			}
		},
		mounted: function(){
			this.updateAll()
			setInterval(this.updateAll, 30000)
		}
	}
</script>
