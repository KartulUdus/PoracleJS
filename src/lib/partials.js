const fs = require('fs')
const path = require('path')
const stripJsonComments = require('strip-json-comments')

function registerPartials(handlebars) {
	const filename = path.join(__dirname, '../../config/partials.json')
	if (!fs.existsSync(filename)) return

	let partials
	try {
		const partialText = stripJsonComments(fs.readFileSync(filename, 'utf8'))
		partials = JSON.parse(partialText)
	} catch (err) {
		throw new Error(`partials.json - ${err.message}`)
	}

	for (const [key, partial] of Object.entries(partials)) {
		handlebars.registerPartial(key, partial)
	}
}

exports.registerPartials = registerPartials