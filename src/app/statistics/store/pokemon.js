import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, timeTarget, filter) {

		let IvMon = {}
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
				IvMon[i] =  {
						name: results[0].meta.name,
						id: i,
						count: results.length,
						imgUrl: results[0].meta.imgurl,
						emoji: results[0].meta.emojiString,
						averageIv: _.meanBy(results, (p) => _.parseInt(p.meta.iv)),
						precentage: results.length / monstersIvRaw.length * 100
				}

			}

		}
		if (filter === 'count'){
			IvMon = _.mapValues(IvMon, function(inner){
				return _.orderBy(inner, ['count'], ['dsc']);
			});
		}

		if (filter === 'iv'){
			IvMon = _.mapValues(IvMon, function(inner){
				return _.orderBy(inner, ['averageIv'], ['dsc']);
			});
		}

		if (filter === 'random'){
			IvMon = _.mapValues(IvMon, function(inner){
				return _.orderBy(inner, ['averageIv'], ['dsc']);
			});
		}

		state.data = IvMon

	}

}


export const state = () => ({
	data: {}
})