import _ from 'lodash'
import axios from 'axios'

export const mutations = {

	async createCharts(state, timeTarget) {
		const firstTime = Math.trunc(new Date().valueOf() - timeTarget)
		const timeArray = []

		//
		const httpInArray = []
		const httpOutArray = []
		const messageInArray = []
		const messageOutArray = []
		const alarmStartArray = []
		const alarmFinishArray = []

		// queries
		const sqlEggWhoCares = []
		const sqlRaidWhoCares = []
		const sqlMonsterWhoCares = []
		const sqlQuestWhoCares = []
		const sqlUpdateLocation = []
		const sqlSelectOneQuery = []
		const sqlDropTableQuery = []
		const sqlCountQuery = []
		const sqlInsertQuery = []
		const sqlInsertOrUpdateQuery = []
		const sqlUpdateQuery = []
		const sqlMysteryQuery = []
		const sqlDeleteQuery = []
		const sqlDeleteByIdQuery = []
		const sqlSelectAllQuery = []
		const sqlAddOneQuery = []
		const sqlCheckSchema = []
		const sqlTotal = []

		// job queue

		const jobQueue = []


		const timeJump = timeTarget / 10
		let raw = await axios.get('/logs/worker.json')
		raw = raw.data.split('\n')
		raw.pop()
		raw = raw.map(JSON.parse)

		const relevant = _.filter(raw, item => _.inRange(
			new Date(item.timestamp.valueOf()),
			new Date().valueOf() - timeTarget,
			new Date().valueOf() + 1,
		))
		const preFirstTime = Math.trunc(firstTime - (timeJump))
		for (let i = 0; i < 10; i += 1) {
			timeArray.push(new Date(firstTime + ((i + 1) * timeJump)).toLocaleTimeString())
			const chunkRelevant = _.filter(relevant, item => _.inRange(
				new Date(item.timestamp).valueOf(),
				new Date(Math.trunc(preFirstTime + ((i + 1) * timeJump))).valueOf(),
				new Date(Math.trunc(firstTime + ((i + 1) * timeJump))).valueOf(),
			))
			// events
			const httpInCount = _.filter(chunkRelevant, { event: 'http:start' })
			const httpOutCount = _.filter(chunkRelevant, { event: 'http:end' })
			const messagesInCount = _.filter(chunkRelevant, { event: 'message:start' })
			const messagesOutCount = _.filter(chunkRelevant, { event: 'message:end' })
			const alarmsStartCount = _.filter(chunkRelevant, { event: 'alarm:start' })
			const alarmsSentCount = _.filter(chunkRelevant, { event: 'alarm:end' })

			// sql

			const CsqlEggWhoCares = _.filter(chunkRelevant, { event: 'sql:eggWhoCare' })
			const CsqlRaidWhoCares = _.filter(chunkRelevant, { event: 'sqlraidWhoCares' })
			const CsqlMonsterWhoCares = _.filter(chunkRelevant, { event: 'sql:monsterWhoCares' })
			const CsqlQuestWhoCares = _.filter(chunkRelevant, { event: 'sql:questWhoCares' })
			const CsqlUpdateLocation = _.filter(chunkRelevant, { event: 'sql:updateLocation' })
			const CsqlSelectOneQuery = _.filter(chunkRelevant, { event: 'sql:selectOneQuery' })
			const CsqlDropTableQuery = _.filter(chunkRelevant, { event: 'sql:dropTableQuer' })
			const CsqlCountQuery = _.filter(chunkRelevant, { event: 'sql:countQuery' })
			const CsqlInsertQuery = _.filter(chunkRelevant, { event: 'sql:insertQuer' })
			const CsqlInsertOrUpdateQuery = _.filter(chunkRelevant, { event: 'sql:insertOrUpdateQuery' })
			const CsqlUpdateQuery = _.filter(chunkRelevant, { event: 'sql:updateQuery' })
			const CsqlMysteryQuery = _.filter(chunkRelevant, { event: 'sql:mysteryQuery' })
			const CsqlDeleteQuery = _.filter(chunkRelevant, { event: 'sql:deleteQuery' })
			const CsqlDeleteByIdQuery = _.filter(chunkRelevant, { event: 'sql:deleteByIdQuery' })
			const CsqlSelectAllQuery = _.filter(chunkRelevant, { event: 'sql:selectAllQuery' })
			const CsqlAddOneQuery = _.filter(chunkRelevant, { event: 'sql:addOneQuery' })
			const CsqlCheckSchema = _.filter(chunkRelevant, { event: 'sql:checkSchema' })
			const CsqlTotal = _.filter(chunkRelevant, chunk => chunk.event && chunk.event.match(/sql:+/g))
			const CjobQueue = _.filter(chunkRelevant, { event: 'queue' })

			// events

			httpInArray.push(httpInCount.length)
			httpOutArray.push(httpOutCount.length)
			messageInArray.push(messagesInCount.length)
			messageOutArray.push(messagesOutCount.length)
			alarmStartArray.push(alarmsStartCount.length)
			alarmFinishArray.push(alarmsSentCount.length)

			// sql

			sqlEggWhoCares.push(CsqlEggWhoCares.length)
			sqlRaidWhoCares.push(CsqlRaidWhoCares.length)
			sqlMonsterWhoCares.push(CsqlMonsterWhoCares.length)
			sqlQuestWhoCares.push(CsqlQuestWhoCares.length)
			sqlUpdateLocation.push(CsqlUpdateLocation.length)
			sqlSelectOneQuery.push(CsqlSelectOneQuery.length)
			sqlDropTableQuery.push(CsqlDropTableQuery.length)
			sqlCountQuery.push(CsqlCountQuery.length)
			sqlInsertQuery.push(CsqlInsertQuery.length)
			sqlInsertOrUpdateQuery.push(CsqlInsertOrUpdateQuery.length)
			sqlUpdateQuery.push(CsqlUpdateQuery.length)
			sqlMysteryQuery.push(CsqlMysteryQuery.length)
			sqlDeleteQuery.push(CsqlDeleteQuery.length)
			sqlDeleteByIdQuery.push(CsqlDeleteByIdQuery.length)
			sqlSelectAllQuery.push(CsqlSelectAllQuery.length)
			sqlAddOneQuery.push(CsqlAddOneQuery.length)
			sqlCheckSchema.push(CsqlCheckSchema.length)
			sqlTotal.push(CsqlTotal.length)

			// queue
			let jqSum = 0
			CjobQueue.forEach((x) => {
				jqSum += x.queue
			})
			jobQueue.push(jqSum / CjobQueue.length)
		}

		const meta = _.filter(relevant, { event: 'message:start' })
		const countMon = _.filter(meta, { type: 'pokemon' }).length
		const countEgg = _.filter(meta, { type: 'egg' }).length
		const countRaid = _.filter(meta, { type: 'raid' }).length
		const countQuest = _.filter(meta, { type: 'quest' }).length

		state.messageTypes = {
			labels: ['monster', 'egg', 'raid', 'quest'],
			datasets: [
				{
					label: `Total messages ${countMon + countEgg + countRaid + countQuest}`,
					backgroundColor: ['#51b868', '#b86053', '#3446b8', '#b62bb8'],
					data: [countMon, countEgg, countRaid, countQuest],
				},
			],
		}

		state.queueChart = {
			labels: timeArray,
			datasets: [
				{
					label: `Discord alert queue in last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#b82b7b',
					data: jobQueue,
				},
			],
		}

		state.httpChart = {
			labels: timeArray,
			datasets: [
				{
					label: `http requests in last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#51b868',
					fill: false,
					data: httpInArray,
				},
				{
					label: `http requests finished last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#3f884b',
					fill: false,
					data: httpOutArray,
				},
			],
		}

		state.messageChart = {
			labels: timeArray,
			datasets: [
				{
					label: `messages started last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#818815',
					fill: false,
					data: messageInArray,
				},
				{
					label: `messages done last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#8f9335',
					fill: false,
					data: messageOutArray,
				},
			],
		}

		state.alarmChart = {
			labels: timeArray,
			datasets: [
				{
					label: `alarm started last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#3d3888',
					fill: false,
					data: alarmStartArray,
				},
				{
					label: `alarm finished  finished last ${Math.trunc(timeTarget / 60000)} minutes`,
					borderColor: '#252288',
					fill: false,
					data: alarmFinishArray,
				},
			],
		}

		state.queryChart = {
			labels: timeArray,
			datasets: [
				{
					label: 'AddOneQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlAddOneQuery,
				},
				{
					label: 'SelectAllQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlSelectAllQuery,
				},
				{
					label: 'DeleteByIdQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlDeleteByIdQuery,
				},
				{
					label: 'MysteryQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlMysteryQuery,
				},
				{
					label: 'DeleteQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlDeleteQuery,
				},

				{
					label: 'UpdateQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlUpdateQuery,
				},

				{
					label: 'InsertOrUpdateQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlInsertOrUpdateQuery,
				},

				{
					label: 'InsertQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlInsertQuery,
				},
				{
					label: 'CountQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlCountQuery,
				},
				{
					label: 'DropTableQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlDropTableQuery,
				},
				{
					label: 'SelectOneQuery',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlSelectOneQuery,
				},
				{
					label: 'UpdateLocation',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlUpdateLocation,
				},
				{
					label: 'QuestWhoCares',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlQuestWhoCares,
				},
				{
					label: 'MonsterWhoCares',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlMonsterWhoCares,
				},
				{
					label: 'RaidWhoCares',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlRaidWhoCares,
				},
				{
					label: 'EggWhoCares',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlEggWhoCares,
				},
				{
					label: 'CheckSchema',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlCheckSchema,
				},
				{
					label: 'Total queries',
					borderColor: `#${Math.floor(Math.random() * 16777215).toString(16)}`,
					fill: false,
					data: sqlTotal,
				},
			],
		}
	},


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
	alarmChart: {},
	queryChart: {},
	queueChart: {},


})