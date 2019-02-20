<template>
    <div>
        <no-ssr>
            <div class="topbuttons">
                <p class="title"> <img class="title" src="~/assets/starchy.svg" height="50" width="66" />PoracleJS Pokémon Stats</p>
                <button class="button" v-on:click="timeTarget = 300000; updateAll()">5m</button>
                <button class="button" v-on:click="timeTarget = 900000; updateAll()">15m</button>
                <button class="button" v-on:click="timeTarget = 1800000; updateAll()">30m</button>
                <button class="button" v-on:click="timeTarget = 3600000; updateAll()">1h</button>
                <button class="button" v-on:click="timeTarget = 10800000; updateAll()">3h</button>
                <button class="button" v-on:click="timeTarget = 32400000; updateAll()">9h</button>
                <button class="button" v-on:click="timeTarget = getMsFromMidnight(); updateAll()">Today</button>
                <div class="dropdown">

                    <button class="dropbtn">Order By</button>
                    <div class="dropdown-content">
                        <a v-on:click="filter = 'new'; updateAll()">Newest</a>
                        <a v-on:click="filter = 'old'; updateAll()">Oldsest</a>
                    </div>
                </div>
            </div>

            <div v-for="log in rawLogs">
                <pre>{{ log | pretty }}</pre>
            </div>
        </no-ssr>
    </div>
</template>

<script>
	import moment from 'moment'

	export default {
		name: 'statistics',
		layout: 'stats',
		data() {
			return {
				timeTarget: 300000,
                filter: 'new'
			}
		},

		filters: {
			pretty: function(value) {
				return JSON.stringify(value, null, 2);
			}
		},

		computed: {
			rawLogs () { return this.$store.state.logs.rawLogs },
	    },

		methods: {
			updateAll() {
				this.$store.commit('logs/createData', { timeTarget: this.timeTarget, filter: this.filter })
			},
			getMsFromMidnight() {
				return new Date().valueOf() - moment().startOf('day').valueOf()
			}
		},
		mounted: function(){
			this.updateAll()
			setInterval(this.updateAll, 30000)
		}
	}
</script>
