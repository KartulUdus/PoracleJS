module.exports = (client, content) => {
	let args = content.slice(client.config.discord.prefix.length).trim().split(/ +/g)
	args = args.map((arg) => client.translator.reverse(arg.toLowerCase().replace(/_/g, ' '), true).toLowerCase())
	args.shift().toLowerCase()

	let initialArgs
	if (args.includes('|')) {
		initialArgs = args.join(' ').split('|').map((com) => com.split(' ').filter((a) => a))
	} else {
		initialArgs = [args]
	}
	return initialArgs
}