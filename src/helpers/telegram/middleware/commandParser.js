const { mount } = require('telegraf')

const regex = /^\/([^@\s]+)@?(?:(\S+)|)\s?([\s\S]*)$/i

/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = () => mount('text', (ctx, next) => {
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
			return args.map((arg) => arg.toLowerCase())
		},
	}
	ctx.state.command = command
	return next()
})
