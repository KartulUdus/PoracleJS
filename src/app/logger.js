const winston = require('winston')
const config = require('config')
require('winston-daily-rotate-file')

const transport = new (winston.transports.DailyRotateFile)({
	filename: 'logs/worker%DATE%.log',
	datePattern: 'YYYY-MM-DD-HH',
	zippedArchive: false,
	maxSize: '50m',
	maxFiles: '4d',
	level: config.general.logLevel
})

module.exports =

	new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({ level: config.general.logLevel }),
			transport
		],
	})
