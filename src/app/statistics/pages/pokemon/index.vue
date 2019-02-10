<template>
    <div>
        <no-ssr>
            <div class="dropdown">

            </div>
            <div class="topbuttons">
                <p class="title"> <img class="title" src="~/assets/starchy.svg" height="50" width="66" />PoracleJS Pokémon Stats</p>
                <button class="button" v-on:click="timeTarget = 300000; updateAll()">5m</button>
                <button class="button" v-on:click="timeTarget = 900000; updateAll()">15m</button>
                <button class="button" v-on:click="timeTarget = 1800000; updateAll()">30m</button>
                <button class="button" v-on:click="timeTarget = 3600000; updateAll()">1h</button>
                <button class="button" v-on:click="timeTarget = 10800000; updateAll()">3h</button>
                <button class="button" v-on:click="timeTarget = 32400000; updateAll()">9h</button>
                <div class="dropdown">

                    <button class="dropbtn">Order By</button>
                    <div class="dropdown-content">
                        <a v-on:click="filter = 'id'; updateAll()">ID</a>
                        <a v-on:click="filter = 'count'; updateAll()">Count</a>
                        <a v-on:click="filter = 'iv'; updateAll()">Average IV</a>
                        <a v-on:click="filter = 'random'; updateAll()">Random</a>

                    </div>
                </div>

            </div>
            <div>
                <table class="monsterTable">
                    <div class="monster" v-for="p in pokemonData"  >
                        <img :src="p.imgUrl"/><br>
                        <nobr>Name: {{p.name}} {{p.emoji}}</nobr><br>
                        <nobr>Count: {{p.count}}</nobr><br>
                        <nobr>Average IV: {{p.averageIv.toFixed(2)}}</nobr><br>
                        <nobr>Precentage of total: {{p.precentage.toFixed(2)}}%</nobr>
                    </div>
                </table>
            </div>
        </no-ssr>
    </div>
</template>

<script>
	export default {
		name: 'statistics',
		layout: 'stats',
		data() {
			return {
				timeTarget: 300000,
                filter: 'count'
			}
		},

		computed: {
			pokemonData () { return this.$store.state.pokemon.data }
		},

		methods: {
			updateAll() {
				this.$store.commit('pokemon/createData', this.timeTarget, this.filter)
			}
		},
		mounted: function(){
			this.updateAll()
			setInterval(this.updateAll, 30000)
		}
	}
</script>
