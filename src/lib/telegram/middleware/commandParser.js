const { mount } = require('telegraf')
/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = (translator) => mount('text', (ctx, next) => {
	const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]*)$/i
	if (!ctx.message) return next()
	const parts = regex.exec(ctx.message.text)
	if (!parts) return next()
	const command = {
		text: ctx.message.text,
		command: parts[1],
		bot: parts[2],
		args: parts[3],
		get splitArgsArray() {
			let args = parts[3].split(/ +/g)
			args = args.map((arg) => translator.reverse(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())
			let initialArgs
			if (args.includes('|')) {
				initialArgs = args.join(' ').split('|').map((com) => com.split(' ').filter((a) => a))
			} else {
				initialArgs = [args]
			}
			return initialArgs
//			const args = parts[3].split('|').map((x) => x.split(/\s+/))
//			return args.map((argss) => argss.map((arg) => translator.reverse(arg.toLowerCase().replace('_', ' '))).filter((x) => x))
		},
	}
	ctx.state.command = command
	return next()
})
