const winston = require('winston')
const config = require('config')

const file = new winston.transports.File({
	filename: 'logs/worker.json',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json()
	),
	maxSize: 10000000,
	tailable: true,
	maxFiles: 5,
	level: 'debug'
})
const console = new (winston.transports.Console)({ level: config.general.logLevel, format: winston.format.simple() })

module.exports =

	winston.createLogger({
		transports: [
			console,
			file
		],
	})
