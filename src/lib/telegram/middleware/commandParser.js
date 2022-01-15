/* eslint no-param-reassign: ["error", { "props": false }] */
module.exports = (translatorFactory) => (ctx, next) => {
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
			if (!parts[3].length) return [[]]

			// Fix curly quotes
			const paramText = parts[3]
				.replace(/[\u2018\u2019]/g, "'")
				.replace(/[\u201C\u201D]/g, '"')

			// Split around quotes
			let args = paramText
				.match(/(".*?"|[^"\s]+)+(?=\s*|\s*$)/g)
				.map((x) => x.replace(/"/g, ''))

			args = args.map((arg) => translatorFactory.reverseTranslateCommand(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())
			let initialArgs
			if (args.includes('|')) {
				let currentArg = []
				initialArgs = []
				for (const arg of args) {
					if (arg === '|') {
						initialArgs.push(currentArg)
						currentArg = []
					} else {
						currentArg.push(arg)
					}
				}
				initialArgs.push(currentArg)
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
}
