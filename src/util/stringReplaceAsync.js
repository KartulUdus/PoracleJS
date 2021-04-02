module.exports = function replaceAsync(string, searchValue, replacer) {
	try {
		if (typeof replacer === 'function') {
			// 1. Run fake pass of `replace`, collect values from `replacer` calls
			// 2. Resolve them with `Promise.all`
			// 3. Run `replace` with resolved values
			const values = []
			String.prototype.replace.call(string, searchValue, (...args) => {
				values.push(replacer(...args))
				return ''
			})
			return Promise.all(values).then((resolvedValues) => String.prototype.replace.call(string, searchValue, () => resolvedValues.shift()))
		}
		return Promise.resolve(
			String.prototype.replace.call(string, searchValue, replacer),
		)
	} catch (error) {
		return Promise.reject(error)
	}
}