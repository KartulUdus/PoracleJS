import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, data) {

		let eggs = []
		let raids = []
		let raw = await axios.get('/logs/worker.json')
		let eggCount = {
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0
		}
		let raidLvlCount = {
			"1": 0,
			"2": 0,
			"3": 0,
			"4": 0,
			"5": 0
		}
		let raidMonArray = []
		let raidMonCountArray = []
		let raidMonColorArray = []

		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		const relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - data.timeTarget,
			new Date().valueOf() + 1
		))
		const meta = _.filter(relevant, { event: 'message:start' })
		const raidRaw = _.filter(meta, function(raid){ return raid.type === 'raid' && raid.meta.pokemon_id > 0 })
		const eggRaw = _.filter(meta, function(raid){ return raid.type === 'egg' && raid.meta.pokemon_id === 0 })

		for ( let i = 1; i < 800; i += 1){
			let results = _.filter(raidRaw, (raid) => { return raid.meta.pokemon_id === i})
			let raidLvlResults = _.filter(raidRaw, (raid) => { return raid.meta.level === i})
			if (raidLvlResults.length) raidLvlCount[i] = raidLvlResults.length

			if (results.length){
				raidMonArray.push(results[0].meta.name)
				raidMonCountArray.push(results.length)
				raidMonColorArray.push(`#${Math.floor(Math.random()*16777215).toString(16)}`)
				raids.push({
						name: results[0].meta.name,
						id: i,
						count: results.length,
						imgUrl: results[0].meta.imgurl,
						gif: results[0].meta.gif,
						emoji: results[0].meta.emojiString,
						level: results[0].meta.level,
						precentage: results.length / raidRaw.length * 100
				})
			}
			let eggResults = _.filter(eggRaw, (egg) => { return egg.meta.level === i})

			if (eggResults.length){
				eggCount[i] = eggResults.length
				eggs.push({
					level: i,
					count: eggResults.length,
					imgUrl: eggResults[0].meta.imgurl,
					precentage: eggResults.length / eggRaw.length * 100
				})
			}
		}
		if (data.filter === 'count'){
			eggs = eggs.sort((a,b) => (a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0))
			raids = raids.sort((a,b) => (a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0))
		}
		if (data.filter === 'level'){
			eggs = eggs.sort((a,b) => (a.level > b.level) ? 1 : ((b.level > a.level) ? -1 : 0))
			raids = raids.sort((a,b) => (a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0))
		}
		if (data.filter === 'id'){
			raids = raids.sort((a,b) => (a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0))
		}
		state.eggData = eggs
		state.raidData = raids

		state.eggDoughnut = {
			labels: ['Level 1 eggs', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
			datasets: [
				{
					label: `Total eggs`,
					backgroundColor: ['#faffaf', '#1EFF00', '#0070DD', '#A335EE', '#FF8000'],
					data: [eggCount['1'], eggCount['2'], eggCount['3'], eggCount['4'], eggCount['5'], ]
				}
			]
		}

		state.raidLvlDoughnut = {
			labels: ['Level 1 Raid', 'Level 2 Raid', 'Level 3 Raid', 'Level 4 Raid', 'Level 5 Raid'],
			datasets: [
				{
					label: `Total Raids by level`,
					backgroundColor: ['#faffaf', '#1EFF00', '#0070DD', '#A335EE', '#FF8000'],
					data: [raidLvlCount['1'], raidLvlCount['2'], raidLvlCount['3'], raidLvlCount['4'], raidLvlCount['5'], ]
				}
			]
		}
		state.raidMonDoughnut = {
			options: {
				title: {
					display: true,
					text: 'TEST'
				}
			},
			labels: raidMonArray,
			datasets: [
				{
					label: `Total Raids by monster`,
					backgroundColor: raidMonColorArray,
					data: raidMonCountArray
				}
			]
		}
	}

}

export const state = () => ({
	eggDoughnut: {},
	raidLvlDoughnut: {},
	raidMonDoughnut: {},
	eggData: [],
	raidData: []
})