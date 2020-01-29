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
		get splitArgs() {
			const args = parts[3].split(/\s+/)
			return args.map((arg) => translator.translate(arg.toLowerCase().replace('_', ' ')))
		},
	}
	ctx.state.command = command
	return next()
})
