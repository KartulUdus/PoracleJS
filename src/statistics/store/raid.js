import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createData(state, data) {

		let eggs = []
		let raids = []
		let raw = await axios.get('/logs/worker.json')
		const eggCount = {
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
		}
		const raidLvlCount = {
			1: 0,
			2: 0,
			3: 0,
			4: 0,
			5: 0,
		}
		const raidMonArray = []
		const raidMonCountArray = []
		const raidMonColorArray = []

		const firstTime = Math.trunc(new Date().valueOf() - data.timeTarget)
		const timeJump = data.timeTarget / 10
		const preFirstTime = Math.trunc(firstTime - (timeJump))
		const timeArray = []

		const instinctArray = []
		const mysticArray = []
		const valorArray = []
		const uncontestedArray = []

		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		const relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - data.timeTarget,
			new Date().valueOf() + 1,
		))
		const meta = _.filter(relevant, { event: 'message:start' })
		const raidRaw = _.filter(meta, raid => raid.type === 'raid' && raid.meta.pokemon_id > 0)
		const eggRaw = _.filter(meta, raid => raid.type === 'egg' && raid.meta.pokemon_id === 0)
		const allRaidRaw = _.filter(meta, raid => raid.type === 'raid' || raid.type === 'egg')

		for (let n = 0; n < 10; n += 1) {
			timeArray.push(new Date(firstTime + ((n + 1) * timeJump)).toLocaleTimeString())
			const chunkRelevant = _.filter(allRaidRaw, item => _.inRange(
				new Date(item.timestamp).valueOf(),
				new Date(Math.trunc(preFirstTime + ((n + 1) * timeJump))).valueOf(),
				new Date(Math.trunc(firstTime + ((n + 1) * timeJump))).valueOf(),
			))

			const instinctCount = _.filter(chunkRelevant, raid => raid.meta.team_id === 3)
			const mysticCount = _.filter(chunkRelevant, raid => raid.meta.team_id === 1)
			const valorCount = _.filter(chunkRelevant, raid => raid.meta.team_id === 2)
			const uncontestedCount = _.filter(chunkRelevant, raid => raid.meta.team_id === 0)

		    instinctArray.push(instinctCount.length)
			mysticArray.push(mysticCount.length)
			valorArray.push(valorCount.length)
			uncontestedCount.push(uncontestedCount.length)
		}

		for (let i = 1; i < 800; i += 1) {
			const results = _.filter(raidRaw, raid => raid.meta.pokemon_id === i)
			const raidLvlResults = _.filter(raidRaw, raid => raid.meta.level === i)
			if (raidLvlResults.length) raidLvlCount[i] = raidLvlResults.length

			if (results.length) {
				raidMonArray.push(results[0].meta.name)
				raidMonCountArray.push(results.length)
				raidMonColorArray.push(`#${Math.floor(Math.random() * 16777215).toString(16)}`)
				raids.push({
					name: results[0].meta.name,
					id: i,
					count: results.length,
					imgUrl: results[0].meta.imgurl,
					gif: results[0].meta.gif,
					emoji: results[0].meta.emojiString,
					level: results[0].meta.level,
					precentage: results.length / raidRaw.length * 100,
				})
			}
			const eggResults = _.filter(eggRaw, egg => egg.meta.level === i)

			if (eggResults.length) {
				eggCount[i] = eggResults.length
				eggs.push({
					level: i,
					count: eggResults.length,
					imgUrl: eggResults[0].meta.imgurl,
					precentage: eggResults.length / eggRaw.length * 100,
				})
			}
		}
		if (data.filter === 'count') {
			eggs = eggs.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
			raids = raids.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
		}
		if (data.filter === 'level') {
			eggs = eggs.sort((a, b) => ((a.level > b.level) ? 1 : ((b.level > a.level) ? -1 : 0)))
			raids = raids.sort((a, b) => ((a.count > b.count) ? 1 : ((b.count > a.count) ? -1 : 0)))
		}
		if (data.filter === 'id') {
			raids = raids.sort((a, b) => ((a.id > b.id) ? 1 : ((b.id > a.id) ? -1 : 0)))
		}
		state.eggData = eggs
		state.raidData = raids

		state.eggDoughnut = {
			labels: ['Level 1 eggs', 'Level 2', 'Level 3', 'Level 4', 'Level 5'],
			datasets: [
				{
					label: 'Total eggs',
					backgroundColor: ['#faffaf', '#1EFF00', '#0070DD', '#A335EE', '#FF8000'],
					data: [eggCount['1'], eggCount['2'], eggCount['3'], eggCount['4'], eggCount['5']],
				},
			],
		}

		state.raidLvlDoughnut = {
			labels: ['Level 1 Raid', 'Level 2 Raid', 'Level 3 Raid', 'Level 4 Raid', 'Level 5 Raid'],
			datasets: [
				{
					label: 'Total Raids by level',
					backgroundColor: ['#faffaf', '#1EFF00', '#0070DD', '#A335EE', '#FF8000'],
					data: [raidLvlCount['1'], raidLvlCount['2'], raidLvlCount['3'], raidLvlCount['4'], raidLvlCount['5']],
				},
			],
		}
		state.raidMonDoughnut = {
			options: {
				title: {
					display: true,
					text: 'Raids by pokemon',
				},
			},
			labels: raidMonArray,
			datasets: [
				{
					label: 'Total Raids by monster',
					backgroundColor: raidMonColorArray,
					data: raidMonCountArray,
				},
			],
		}
		state.teamChart = {
			labels: timeArray,
			datasets: [
				{
					label: 'Mystic',
					borderColor: '#0000b8',
					fill: false,
					data: mysticArray,
				},
				{
					label: 'Valor',
					borderColor: '#880000',
					fill: false,
					data: valorArray,
				},
				{
					label: 'Instinct',
					borderColor: '#c2b942',
					fill: false,
					data: instinctArray,
				},
				{
					label: 'Uncontested',
					borderColor: '#828282',
					fill: false,
					data: uncontestedArray,
				},
			],
		}
	},

}

export const state = () => ({
	eggDoughnut: {},
	raidLvlDoughnut: {},
	raidMonDoughnut: {},
	teamChart: {},
	eggData: [],
	raidData: [],
})