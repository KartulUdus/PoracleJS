import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, data) {

		let IvMon = []
		let noIvMon = []
		let raw = await axios.get('/logs/worker.json')
		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		const relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - data.timeTarget,
			new Date().valueOf() + 1,
		))
		const meta = _.filter(relevant, { event: 'message:start' })
		const monstersIvRaw = _.filter(meta, monster => monster.type === 'pokemon' && monster.meta.weight > 0)
		const monstersRaw = _.filter(meta, monster => monster.type === 'pokemon' && !monster.meta.weight)
		for (let i = 1; i < 800; i += 1) {
			const results = _.filter(monstersIvRaw, mon => mon.meta.pokemon_id === i)
			if (results.length) {
				IvMon.push({
					name: results[0].meta.name,
					id: i,
					count: results.length,
					imgUrl: results[0].meta.imgurl,
					gif: results[0].meta.gif,
					emoji: results[0].meta.emojiString,
					averageIv: _.meanBy(results, p => _.parseInt(p.meta.iv)),
					precentage: results.length / monstersIvRaw.length * 100,
				})
			}
			const noIvResults = _.filter(monstersRaw, mon => mon.meta.pokemon_id === i)
			if (noIvResults.length) {
				noIvMon.push({
					name: noIvResults[0].meta.name,
					id: i,
					count: noIvResults.length,
					imgUrl: noIvResults[0].meta.imgurl,
					gif: noIvResults[0].meta.gif,
					emoji: noIvResults[0].meta.emojiString,
					precentage: noIvResults.length / monstersRaw.length * 100,
				})
			}
		}
		if (data.filter === 'count') {
			IvMon = IvMon.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
			noIvMon = noIvMon.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
		}
		if (data.filter === 'iv') {
			IvMon = IvMon.sort((a, b) => ((a.averageIv > b.averageIv) ? 1 : ((b.averageIv > a.averageIv) ? -1 : 0)))
			noIvMon = noIvMon.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
		}
		if (data.filter === 'random') {
			IvMon = IvMon.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
			noIvMon = noIvMon.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
		}
		if (data.filter === 'id') {
			IvMon = IvMon.sort((a, b) => ((a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0)))
			noIvMon = noIvMon.sort((a, b) => ((a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0)))
		}
		state.ivData = IvMon
		state.noIvData = noIvMon
	},

}

export const state = () => ({
	ivData: [],
	noIvData: [],
})