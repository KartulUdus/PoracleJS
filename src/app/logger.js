const winston = require('winston')
const config = require('config')

module.exports =

	new (winston.Logger)({
		transports: [
			new (winston.transports.Console)({ level: config.general.logLevel }),
			new (winston.transports.File)({
				filename: 'logs/worker.log',
				level: config.general.logLevel,
			}),
		],
	})
