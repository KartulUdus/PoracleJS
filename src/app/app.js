const fs = require('fs')
const path = require('path')
const config = require('config')
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
	.setErrorHandler(function (error, request, reply) {
		log.warn(`Fastify unhappy with error: ${error.message}`)
		reply.send({message: error.message})
	})


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

// if map is enabled fork it as a child process and bounce it on exit
if(config.map.enabled){
	let map = cp.fork(`${__dirname}/../../map.js`)
	map.on('exit', (err) => {
		log.warn(`Map process died and said: ${err}. Restarting ...`)
		let map = cp.fork(`${__dirname}/../../map.js`)
	})



}