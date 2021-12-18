function registerPartials(handlebars) {
	const partials = require('../../config/partials.json')

	// eslint-disable-next-line guard-for-in
	for (const key in partials) {
		handlebars.registerPartial(key, partials[key])
	}
}

exports.registerPartials = registerPartials