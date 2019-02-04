<template>
    <div class="line-chart">
        <no-ssr>
            <button v-on:click="timeTarget = 300000; updateAll()">5m</button>
            <button v-on:click="timeTarget = 900000; updateAll()">15m</button>
            <button v-on:click="timeTarget = 1800000; updateAll()">30m</button>
            <button v-on:click="timeTarget = 3600000; updateAll()">1h</button>
            <button v-on:click="timeTarget = 10800000; updateAll()">3h</button>
            <button v-on:click="timeTarget = 32400000; updateAll()">9h</button>



            <lineChart :chartData="this.httpChart" :options="{ maintainAspectRatio: false }" />
            <lineChart :chartData="this.messageChart" :options="{ maintainAspectRatio: false }" />

            <lineChart :chartData="this.alarmChart" :options="{ maintainAspectRatio: false }" />
            <Doughnut :chartData="messageTypes" :options="{ legend: { display: false }, maintainAspectRatio: false }" />
        </no-ssr>
    </div>
</template>

<script>
	import lineChart from '~/components/lineChart'
	import Doughnut from '~/components/doughnutChart'

	export default {


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
			messageTypes () { return this.$store.state.stats.messageTypes }


		},

        methods: {
			updateAll() {
				this.$store.commit('stats/createCharts', this.timeTarget)
			}
		},
		mounted: function(){
			this.updateAll()
			setInterval(this.updateAll, 30000)
		}
	}
</script>
