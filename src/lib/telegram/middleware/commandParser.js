const { mount } = require('telegraf')
/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = (translatorFactory) => mount(['text', 'location'], (ctx, next) => {
	const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]*)$/i
	if (!ctx.message) return next()

	let commandText = ctx.message.text || ''
	/* if we have a location type message -> convert location data to text string to handle as text command */
	if (ctx.message.location) {
		commandText = `/location ${ctx.message.location.latitude},${ctx.message.location.longitude}`
	}

	const parts = regex.exec(commandText)
	if (!parts) return next()
	const command = {
		text: commandText,
		command: parts[1],
		bot: parts[2],
		args: parts[3],
		get splitArgsArray() {
			let args = parts[3].split(/ +/g)
			args = args.map((arg) => translatorFactory.reverseTranslateCommand(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())
			let initialArgs
			if (args.includes('|')) {
				initialArgs = args.join(' ').split('|').map((com) => com.split(' ').filter((a) => a))
			} else {
				initialArgs = [args]
			}
			return initialArgs
			// const args = parts[3].split('|').map((x) => x.split(/\s+/))
			// return args.map((argss) => argss.map((arg) => translator.reverse(arg.toLowerCase().replace('_', ' '))).filter((x) => x))
		},
	}
	ctx.state.command = command
	return next()
})
