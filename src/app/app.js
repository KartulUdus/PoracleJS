const fs = require('fs')
const path = require('path')
const config = require('config')
const mustache = require('mustache')
const fastify = require('fastify')()
const log = require('./logger')
const cp = require('child_process')

// Start Commander

let commandWorker = cp.fork(`${__dirname}/helpers/commands`, [config.discord.token[0]])
commandWorker.on('exit', () => {
	commandWorker = cp.fork(`${__dirname}/helpers/commands`, [config.discord.token[0]])
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

// Register routes

fastify.register(require('./schemas'))
	.register(require('./routes/staticMap'))
	.register(require('./routes/receiver'))
	.register(require('fastify-static'), {
		root: path.join(__dirname, 'helpers', 'staticmap'),
		prefix: '/images/', // optional: default '/'
	})
	.register(require('point-of-view'), {
		engine: {
			mustache: mustache
		}
	})


const start = async () => {
	try {
		await fastify.listen(config.general.port, config.general.host)
		log.info(`Poracle started on ${fastify.server.address().address}:${fastify.server.address().port}`)
		log.info(`server available routes are ${fastify.printRoutes()}`)

	}
	catch (err) {
		log.error(err)
	}
}


start()

