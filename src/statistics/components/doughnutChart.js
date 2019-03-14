import { Doughnut, mixins } from 'vue-chartjs'

const { reactiveProp } = mixins


export default {
	extends: Doughnut,
	mixins: [reactiveProp],
	props: ['data', 'options'],
	mounted() {
		this.renderChart(this.chartData, this.options)
	},
}