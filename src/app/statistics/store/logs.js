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
			new Date().valueOf() + 1
		))

		if (data.filter === 'old'){
			relevant = relevant.sort((a,b) => (new Date(a.timestamp).valueOf() > new Date(b.count).valueOf()) ? 1 : ((new Date(b.count).valueOf() > new Date(a.timestamp).valueOf()) ? -1 : 0))
		}

		state.rawLogs = relevant
	}

}

export const state = () => ({
	rawLogs: []
})