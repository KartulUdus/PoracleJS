import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, timeTarget) {


		let raw = await axios.get('/logs/worker.json')
		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		const relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - timeTarget,
			new Date().valueOf() + 1
		))
		const meta = _.filter(relevant, { event: 'message:start' })
		const monstersRaw = _.filter(meta, { type: 'pokemon' })
		monstersRaw.forEach(monster => console.log(monster.meta))

		e
	}


}


export const state = () => ({
	data: {}
})