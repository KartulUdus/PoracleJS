import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createCharts(state, timeTarget) {
		const firstTime = Math.trunc(new Date().valueOf() - timeTarget)
		const timeArray = []
		const httpInArray = []
		const httpOutArray = []
		const messageInArray = []
		const messageOutArray = []
		const alarmStartArray = []
		const alarmFinishArray = []
		/* let httpE = _.filter(records, function(req){
			return req.event === 'http:start' || req.event === 'http:end'
		}) */
		const timeJump = timeTarget / 10
		let raw = await axios.get('/logs/worker.json')
		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		const relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - timeTarget,
			new Date().valueOf() + 1
		))
		const preFirstTime = Math.trunc(firstTime - (timeJump))
		for (let i = 0; i < 10; i += 1) {
			timeArray.push(new Date(firstTime + ((i + 1) * timeJump)).toLocaleTimeString())
			const chunkRelevant = _.filter(relevant, item => _.inRange(
				new Date(item.timestamp).valueOf(),
				new Date(Math.trunc(preFirstTime + ((i + 1) * timeJump))).valueOf(),
				new Date(Math.trunc(firstTime + ((i + 1) * timeJump))).valueOf(),
			))

			const httpInCount = _.filter(chunkRelevant, { event: 'http:start' })
			const httpOutCount = _.filter(chunkRelevant, { event: 'http:end' })
			const messagesInCount = _.filter(chunkRelevant, { event: 'message:start' })
			const messagesOutCount = _.filter(chunkRelevant, { event: 'message:end' })
			const alarmsStartCount = _.filter(chunkRelevant, { event: 'alarm:start' })
			const alarmsSentCount = _.filter(chunkRelevant, { event: 'alarm:end' })


			httpInArray.push(httpInCount.length)
			httpOutArray.push(httpOutCount.length)
			messageInArray.push(messagesInCount.length)
			messageOutArray.push(messagesOutCount.length)
			alarmStartArray.push(alarmsStartCount.length)
			alarmFinishArray.push(alarmsSentCount.length)
		}

		const meta = _.filter(relevant, { event: 'message:start' })
		const countMon = _.filter(meta, { type: 'pokemon' }).length
		const countEgg = _.filter(meta, { type: 'egg' }).length
		const countRaid = _.filter(meta, { type: 'raid' }).length
		const countQuest = _.filter(meta, { type: 'quest' }).length

		state.messageTypes = {
			labels: ['mosnter', 'egg', 'raid', 'quest'],
			datasets: [
				{
					label: `Total messages ${countMon + countEgg + countRaid + countQuest}`,
					backgroundColor: ['#51b868', '#b86053', '#3446b8', '#b62bb8'],
					data: [countMon, countEgg, countRaid, countQuest]
				}
			]
		}


		state.httpChart = {
			labels: timeArray,
			datasets: [
				{
					label: `http requests in last ${timeTarget / 60000} minutes`,
					backgroundColor: '#51b868',
					data: httpInArray
				},
				{
					label: `http requests finished last ${timeTarget / 60000} minutes`,
					backgroundColor: '#3f884b',
					data: httpOutArray
				}
			]
		}

		state.messageChart = {
			labels: timeArray,
			datasets: [
				{
					label: `messages started last ${timeTarget / 60000} minutes`,
					backgroundColor: '#818815',
					data: messageInArray
				},
				{
					label: `messages done last ${timeTarget / 60000} minutes`,
					backgroundColor: '#8f9335',
					data: messageOutArray
				}
			]
		}

		state.alarmChart = {
			labels: timeArray,
			datasets: [
				{
					label: `alarm started last ${timeTarget / 60000} minutes`,
					backgroundColor: '#3d3888',
					data: alarmStartArray
				},
				{
					label: `alarm finished  finished last ${timeTarget / 60000} minutes`,
					backgroundColor: '#252288',
					data: alarmFinishArray
				}
			]
		}
	}


}


export const state = () => ({
	requests: [],
	responses: [],
	discordMessages: [],
	errors: [],
	sqlQueries: [],
	messageTypes: {},
	httpChart: {},
	messageChart: {},
	alarmChart: {}


})