const fs = require('fs')
const path = require('path')
const config = require('config')
const fastify = require('fastify')()
const log = require('./logger')
const cp = require('child_process')
const nuxtConfig = require('./statistics/nuxt.config.js')
// Start Commander

let commandWorker = cp.fork(`${__dirname}/helpers/commands`, [config.discord.token[0]])
commandWorker.on('message', (msg) => {
	if(msg.reason === 'seppuku') commandWorker = cp.fork(`${__dirname}/helpers/commands`, [config.discord.token[0]])
})

// Check that DTS is present && create if not

if (!fs.existsSync(path.join(__dirname, '../../config/questdts.json'))) {
	const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/questdts.json.example'), 'utf8')
	fs.writeFileSync(path.join(__dirname, '../../config/questdts.json'), emergQuestDtsConf)
}
if (!fs.existsSync(path.join('src/app/helpers/', config.geocoding.geofence))) {
	const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/geofence_example.json'), 'utf8')
	fs.writeFileSync(path.join('src/app/helpers/', config.geocoding.geofence), emergQuestDtsConf)
}
if (!fs.existsSync(path.join(__dirname, '../../config/dts.json'))) {
	const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/dts.json.example'), 'utf8')
	fs.writeFileSync(path.join(__dirname, '../../config/dts.json'), emergQuestDtsConf)
}
if (!fs.existsSync(path.join(__dirname, '../../config/emoji.json'))) {
	const emergQuestDtsConf = fs.readFileSync(path.join(__dirname, '../../config/emoji.json.example'), 'utf8')
	fs.writeFileSync(path.join(__dirname, '../../config/emoji.json'), emergQuestDtsConf)
}
// Register routes


fastify
	.register(require('./schemas'))
	.register(require('./routes/staticMap'))
	.register(require('./routes/receiver'))
	.register(require('fastify-static'), {
		root: path.join(__dirname, '../../logs/'),
		prefix: '/logs/'
	})

fastify
	.setErrorHandler((error, request, reply) => {
		log.warn(`Fastify unhappy with error: ${error}`)
		reply.send({ message: error.message, request: request.body })
	})
	.register(require('./helpers/nuxt'), {
		config: nuxtConfig
	})
	.after((e) => {
		if (e) log.error(e)
		fastify.nuxt('/')
		fastify.nuxt('/pokemon')

	})

const start = async () => {
	try {
		await fastify.listen(config.general.port, config.general.host)
		log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
	}
	catch (err) {
		log.error(err)
	}
}


start()

