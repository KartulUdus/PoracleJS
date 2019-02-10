import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, timeTarget, filter = 'iv') {

		let IvMon = []
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
		const monstersIvRaw = _.filter(meta, function(monster){return monster.type === 'pokemon' && monster.meta.weight > 0 })
		for ( let i = 1; i < 800; i += 1){
			let results = _.filter(monstersIvRaw, (mon) => { return mon.meta.pokemon_id === i})
			if (results.length){
				IvMon.push({
						name: results[0].meta.name,
						id: i,
						count: results.length,
						imgUrl: results[0].meta.imgurl,
						gif: results[0].meta.gif,
						emoji: results[0].meta.emojiString,
						averageIv: _.meanBy(results, (p) => _.parseInt(p.meta.iv)),
						precentage: results.length / monstersIvRaw.length * 100
				})

			}

		}
		let IvMonSorted = []
		if (filter === 'count'){
			IvMonSorted = _.sortBy(IvMon, o => o.count)
		}
		if (filter === 'iv'){
			IvMonSorted = _.sortBy(IvMon, o => o.averageIv)
		}
		if (filter === 'random'){
			IvMonSorted = _.sortBy(IvMon, o => o.count)
		}
		if (filter === 'id'){
			IvMonSorted = _.sortBy(IvMon, o => o.id)
		}
		state.data = IvMonSorted
	},

	async compareValues(key, order='asc') {
	return function(a, b) {
		if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
			return 0;
		}

		const varA = (typeof a[key] === 'string') ?
			a[key].toUpperCase() : a[key];
		const varB = (typeof b[key] === 'string') ?
			b[key].toUpperCase() : b[key];

		let comparison = 0;
		if (varA > varB) {
			comparison = 1;
		} else if (varA < varB) {
			comparison = -1;
		}
		return (
			(order === 'desc') ? (comparison * -1) : comparison
		);
	};
}

}


export const state = () => ({
	data: []
})