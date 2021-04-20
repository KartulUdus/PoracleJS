const winston = require('winston')
require('winston-daily-rotate-file')
const config = require('config')
const path = require('path')

// Emerg – the application is in an emergency state.
// Alert – the application owners need to be alerted.
// Crit – the application is in a critical state.
// Error – a serious problem occurred while processing the current operation. Such a message usually requires the user
//     to interact with the application or research the problem in order to find the cause and resolve it.
//     (Tip: exceptions are usually reported as errors because they usually have a similar meaning.)
// Warning – such messages are reported when something unusual happened that isn’t critical to process the current operation (and the application in general), but would be useful to review to decide if it should be resolved. (Tip: this level is usually selected as active for applications in production.)
// Info – informative messages are usually used for reporting significant application progress and stages.
//   Informative messages should not be reported too frequently because they can quickly become “noise.”
// Notice – Notice messages are usually used for developers to notice application state.
// Debug – used for debugging messages with extended information about application processing.
//  Such messages usually report calls of important functions along with results they return and values of specific
//  variables, or parameters.
// Trace – this level is most informative (and usually even excessive). Trace messages report most application actions
//     or events and are mostly used to follow application logic in full detail.
//
// node log levels: error, warn, info, verbose, debug, silly

// Webhooks Log
// --- at info level, broadly as now but ideally in a form that can be curled in perhaps?

// Inbound Mon Processing (levels)
// ---  no one cares - verbose level
// ---  match count at -- info level
// ---  each user found, exact dts selected - debug level
// ---  mon duplicates at debug level

// Telegram sending (levels)
// --- high level who we send to -- ...
// ----  full message text - debug
// Discord sending (levels)
// --- as above
// Command processing
// --- commands issued at info level
// ----- debug - actual events received for discord
// ----- and raw data from telegram?
// General log (levels)
// --- not sure what will go in here het?

// Error log
// -- exceptions logged and uncaught exceptions

const logInfo = {}

function poracleFormatter(debug) {
	const {
		timestamp, level, message, ...args
	} = debug
	return `${timestamp} ${logInfo.workerId ? `$${logInfo.workerId} ` : ''}${level}: ${message} ${Object.keys(args).length ? JSON.stringify(args) : ''}`
}

const poracleFormat = winston.format.combine(
	winston.format.timestamp({
		format: 'YYYY-MM-DD HH:mm:ss',
	}),
	winston.format.printf(poracleFormatter),
)

const debugLog = new winston.transports.DailyRotateFile({
	filename: 'general-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'general.log',
	format: poracleFormat,
	createSymlink: true,
	// datePattern: 'YYYY-MM-DD',
	// maxSize: `${config.logger.logSize}m`,
	// frequency: '1d',
	maxFiles: config.logger.dailyLogLimit,
	level: config.logger.logLevel,
})

const errorLog = new winston.transports.DailyRotateFile({
	filename: 'errors-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'errors.log',
	format: poracleFormat,
	createSymlink: true,
	// datePattern: 'YYYY-MM-DD',
	//	maxSize: `${config.logger.logSize}m`,
	// frequency: '1d',
	maxFiles: config.logger.dailyLogLimit,
	handleExceptions: true,
	handleRejections: true,
	level: 'warn',
})

const dataStoreLog = new winston.transports.DailyRotateFile({
	filename: 'webhooks-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'webhooks.log',
	format: poracleFormat,
	createSymlink: true,
	datePattern: 'YYYY-MM-DD-HH',
	//	maxSize: `${config.logger.logSize}m`,
	// frequency: '1h',
	maxFiles: config.logger.webhookLogLimit,
	level: config.logger.enableLogs.webhooks ? config.logger.logLevel : 'warn',
})

const discordLog = new winston.transports.DailyRotateFile({
	filename: 'discord-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'discord.log',
	format: poracleFormat,
	createSymlink: true,
	// datePattern: 'YYYY-MM-DD',
	// maxSize: `${config.logger.logSize}m`,
	// frequency: '1d',
	maxFiles: config.logger.dailyLogLimit,
	level: config.logger.enableLogs.discord ? config.logger.logLevel : 'warn',
})

const commandLog = new winston.transports.DailyRotateFile({
	filename: 'commands-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'commands.log',
	format: poracleFormat,
	createSymlink: true,
	// datePattern: 'YYYY-MM-DD',
	//	maxSize: `${config.logger.logSize}m`,
	// frequency: '1d',
	handleExceptions: true,
	maxFiles: config.logger.dailyLogLimit,
	level: `${config.logger.logLevel}`,
})

const processorLog = new winston.transports.DailyRotateFile({
	filename: 'controller-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'controller.log',
	format: poracleFormat,
	createSymlink: true,
	// datePattern: 'YYYY-MM-DD',
	//	maxSize: `${config.logger.logSize}m`,
	// frequency: '1d',
	handleExceptions: true,
	maxFiles: config.logger.dailyLogLimit,
	level: `${config.logger.logLevel}`,
})

const telegramLog = new winston.transports.DailyRotateFile({
	filename: 'telegram-%DATE%.log',
	dirname: path.join(__dirname, '../../logs'),
	symlinkName: 'telegram.log',
	format: poracleFormat,
	createSymlink: true,
	// datePattern: 'YYYY-MM-DD',
	//	maxSize: `${config.logger.logSize}m`,
	// frequency: '1d',
	handleExceptions: true,
	maxFiles: config.logger.dailyLogLimit,
	level: config.logger.enableLogs.telegram ? config.logger.logLevel : 'warn',
})

const consoleLog = new (winston.transports.Console)({
	format: winston.format.combine(
		winston.format.colorize(),
		winston.format.simple(),
		winston.format.colorize(),
		winston.format.errors({ stack: true }),
	),
	handleExceptions: true,
	level: config.logger.consoleLogLevel,
})

module.exports.log = winston.createLogger({
	transports: [
		consoleLog,
		errorLog,
		debugLog,
	],
	exitOnError: false,
})

module.exports.webhooks = winston.createLogger({
	transports: [
		dataStoreLog,
		errorLog,
	],
	exitOnError: false,
})

module.exports.telegram = winston.createLogger({
	transports: [
		telegramLog,
		consoleLog,
		errorLog,
	],
	exitOnError: false,
})

module.exports.command = winston.createLogger({
	transports: [
		commandLog,
		consoleLog,
		errorLog,
	],
	exitOnError: false,
})

module.exports.discord = winston.createLogger({
	transports: [
		discordLog,
		consoleLog,
		errorLog,
	],
	exitOnError: false,
})

module.exports.controller = winston.createLogger({
	transports: [
		processorLog,
		errorLog,
		consoleLog,
	],
	exitOnError: false,
})

module.exports.setWorkerId = (id) => {
	logInfo.workerId = id
}