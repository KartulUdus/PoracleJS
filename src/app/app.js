const fs = require('fs')
const path = require('path')
const config = require('config')
const prettyjson = require('prettyjson')
const fastify = require('fastify')()
const log = require('./logger')
const cp = require('child_process')
let commandWorker = cp.fork(`${__dirname}/helpers/commands`, [config.discord.token[0]])
commandWorker.on('exit', () => {
	let commandWorker = cp.fork(`${__dirname}/helpers/commands`, [config.discord.token[0]])
})
// register schema and routes

if (!fs.existsSync(path.join(__dirname,'../../config/questdts.json'))){
	let emergQuestDtsConf = fs.readFileSync(path.join( __dirname, '../../config/questdts.json.example'), "utf8")
	fs.writeFileSync(path.join(__dirname, '../../config/questdts.json'), emergQuestDtsConf)
}
if (!fs.existsSync(path.join(__dirname, '../../config/dts.json'))){
	let emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/dts.json.example'), "utf8")
	fs.writeFileSync(path.join(__dirname, '../../config/dts.json') , emergQuestDtsConf)
}

fastify.register(require('./schemas'))
	.register(require('./routes/healthcheck'))
	.register(require('./routes/receiver'))


const start = async () => {
	try {
		await fastify.listen(config.general.port, config.general.host)
		log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
		log.info(`server available routes are ${fastify.printRoutes()}`)

	} catch (err) {
		log.error(err)
	}
}


start()

