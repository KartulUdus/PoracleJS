const winston = require('winston')
const config = require('config')

const file = new winston.transports.File({
	filename: 'logs/worker.json',
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
		winston.format.errors({ stack: true }),
	),
	maxsize: 25000000,
	tailable: true,
	handleExceptions: true,
	maxFiles: 1,
	level: 'debug',
})
const console = new (winston.transports.Console)({
	level: config.general.logLevel,
	format: winston.format.combine(
		winston.format.simple(),
		winston.format.errors({ stack: true }),
	),
	handleExceptions: true,
})

module.exports =

	winston.createLogger({
		transports: [
			console,
			file,
		],
	})
