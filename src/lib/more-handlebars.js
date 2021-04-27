// From just-handlebars-helpers

/**
 * Check if param is an object.
 *
 * @param {any} thing
 * @returns {boolean}
 */
function isObject(thing) {
	return (typeof thing === 'object')
}

/**
 * Concat two or more strings.
 *
 * @example
 *    {{concat 'Hello' ' world' '!!!'}}   => 'Hello world!!!'
 *
 * @param {any} params
 * @returns {string}
 */
function concat(...params) {
	// Ignore the object appended by handlebars.
	if (isObject(params[params.length - 1])) {
		params.pop()
	}

	return params.join('')
}

function registerHelpers(handlebars) {
	handlebars.registerHelper('concat', concat)
}

exports.registerHelpers = registerHelpers