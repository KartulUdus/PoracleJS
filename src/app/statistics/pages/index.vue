<template>
    <div class="bar-chart">
        <no-ssr>
            <BarChart :data="something" :options="{ maintainAspectRatio: false }" />
        </no-ssr>
    </div>
</template>

<script>
	import BarChart from '~/components/lineChart'
	import axios from 'axios'
	import moment from 'moment'
    import _ from 'lodash'

	export default {

		Data() {

			return {
				something: {}
			}
		},

		components: {
			BarChart
		},

        methods: {
            makeTimeArray (timeTarget){
            	const firstTime = Math.trunc(new Date().valueOf() - timeTarget)
                let timeArray = []
                for(let i = 0; i< 10; i++){
                	timeArray.push(new Date(firstTime + (i * timeTarget/10)))
                }

                this.chart =
					{
						labels: timeArray,
						datasets: [
							{
								label: 'Messages last 5 minutes',
								backgroundColor: '#41b883',
								data: [12,123,11,1,23,1,123,124,123,11]
							}
						]
					}
					this.something = chart
            },

			timeFilter (collection, begin, end){
				//console.log(collection, begin, end)
				return _.filter(collection, function(item) {
					return _.inRange(
						new Date(item.timestamp.valueOf()),
						begin,
						end + 1
					);
				})
            }
        },
		mounted: function(){

			axios.get( `/logs/worker.json`).then( raw => {
				let records = raw.data.split('\n')
				records.pop()
				records = records.map(JSON.parse)
				let errors = _.filter(records, { 'level': 'error' })
				let warnings = _.filter(records, { 'level': 'warn' })
				let debug = _.filter(records, { 'level': 'debug' })
				let httpE = _.filter(debug, function(req){
					return req.event === 'http:start' || req.event === 'http:end'
				})
				let filteredhttpE = this.timeFilter(httpE, (new Date().valueOf() -300000), new Date().valueOf())
				let something = this.makeTimeArray(300000)

			})

		}

	}
</script>

<style scoped>
    .bar-chart {
        position: fixed;
        left: 10%;
        top: 10%;
        width: 80%;
        height: 80%;
    }
</style>
