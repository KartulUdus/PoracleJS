import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, data) {

		let raw = await axios.get('/logs/worker.json')
		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		let relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - data.timeTarget,
			new Date().valueOf() + 1,
		))
		if (data.logType === 'warn') {
			relevant = _.filter(relevant, { level: 'warn' })
		}
		if (data.logType === 'err') {
			relevant = _.filter(relevant, { level: 'error' })
		}
		if (data.filter === 'new') {
			relevant = relevant.reverse()
		}

		state.rawLogs = relevant
	},

}

export const state = () => ({
	rawLogs: [],
})