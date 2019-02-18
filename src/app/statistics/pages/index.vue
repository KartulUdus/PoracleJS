<template>
    <div class="line-chart">
        <no-ssr>
            <div class="topbuttons">
                <p class="title"> <img class="title" src="~/assets/starchy.svg" height="50" width="66" />PoracleJS Stats</p>
                <button class="button" v-on:click="timeTarget = 300000; updateAll()">5m</button>
                <button class="button" v-on:click="timeTarget = 900000; updateAll()">15m</button>
                <button class="button" v-on:click="timeTarget = 1800000; updateAll()">30m</button>
                <button class="button" v-on:click="timeTarget = 3600000; updateAll()">1h</button>
                <button class="button" v-on:click="timeTarget = 10800000; updateAll()">3h</button>
                <button class="button" v-on:click="timeTarget = 32400000; updateAll()">9h</button>
                <button class="button" v-on:click="timeTarget = getMsFromMidnight(); updateAll()">Today</button>

            </div>
            <tr  class="line-chart" >
                <td><lineChart :chartData="this.queueChart" :options="{ responsive: true , maintainAspectRatio: false }" /></td>
                <td><lineChart :chartData="this.httpChart" :options="{ responsive: true , maintainAspectRatio: false }" /></td>
            </tr>
            <tr  class="line-chart" >
                <td><lineChart :chartData="this.messageChart" :options="{ responsive: true , maintainAspectRatio: false }" /></td>
                <td><lineChart :chartData="this.alarmChart" :options="{ responsive: true , maintainAspectRatio: false }" /></td>
            </tr>

            <lineChart class="line-chart" :chartData="this.queryChart" :options="{ responsive: true , maintainAspectRatio: false }" />

            <Doughnut :chartData="messageTypes" :options="{ maintainAspectRatio: false }" />
        </no-ssr>
    </div>
</template>

<script>
	import lineChart from '~/components/lineChart'
	import Doughnut from '~/components/doughnutChart'
    import moment from 'moment'

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
			httpChart () { return this.$store.state.stats.httpChart },
			messageChart () { return this.$store.state.stats.messageChart },
			alarmChart () {	return this.$store.state.stats.alarmChart },
			queryChart () { return this.$store.state.stats.queryChart },
			queueChart () { return this.$store.state.stats.queueChart },
			messageTypes () { return this.$store.state.stats.messageTypes }

		},

        methods: {
			updateAll() {
				this.$store.commit('stats/createCharts', this.timeTarget)
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
