const config = require('config')
const fastify = require('fastify')()
const log = require('./src/app/logger')
const path = require('path')
const serveStatic = require('serve-static')
const fs = require('fs')

const mysql = require('promise-mysql2')
const db = mysql.createPool(config.db)
const MapController = require('./src/app/controllers/rawData')
const mapController = new MapController(db)

// If the starting position is not a lat, lon pair, treat it as an address and geocode for coords

mapController.getStartPos(config.map.startPos).then(function(startPoint){

// This is a hack to generate nuxt.config.js based on your single config/default.json

	if (fs.existsSync('./nuxt.config.js')) fs.unlinkSync('./nuxt.config.js')
	const confTemplate = fs.readFileSync('./nuxt.config.js.template', "utf8")
	const nuxtconf = confTemplate
		.replace(/TILESERVER/g, config.map.tileServer)
		.replace(/STARTPOS/g, startPoint)
		.replace(/STARTZOOM/g, config.map.startZoom)
	fs.writeFileSync('./nuxt.config.js', nuxtconf)

	process.on('message', (msg) => {
		console.log(msg.body)
	})

	fastify
		.use('/static', serveStatic(path.join(__dirname, `/assets/${config.map.spriteDir}`)))
		.setErrorHandler(function (error, request, reply) {
			log.warn(`Fastify unhappy with error: ${error.message}`)
			reply.send({message: error.message})
		})
		.register(require('./src/app/routes/rawData'))
		.register(require('fastify-vue-plugin'), {
		config: require('./nuxt.config.js'),
		attachProperties: ['session']

	}).after(e => {
		if (e) log.error(e)
		fastify.nuxt('/')
	})

// other stuff/routes

	fastify.listen(config.map.port, config.map.host , (e) => {
		if (e) log.error(e)
		log.info(`PoracleMap started on ${fastify.server.address().address}:${fastify.server.address().port}`)
	})

})

