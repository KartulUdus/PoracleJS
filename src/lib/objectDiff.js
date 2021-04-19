// https://stackoverflow.com/questions/33232823/how-to-compare-two-objects-and-get-key-value-pairs-of-their-differences
// modified to allow type coercion

const empty =	{}

const isObject = (x) => Object(x) === x

const diff1 = (left = {}, right = {}, rel = 'left') => Object.entries(left)
	// eslint-disable-next-line no-nested-ternary
	.map(([k, v]) => (isObject(v) && isObject(right[k])
		? [k, diff1(v, right[k], rel)]
		: right[k] != v
			? [k, { [rel]: v }]
			: [k, empty]))
	.reduce((acc, [k, v]) => (v === empty
		? acc
		: { ...acc, [k]: v }),
	empty)

const merge = (left = {}, right = {}) => Object.entries(right)
	.reduce((acc, [k, v]) => (isObject(v) && isObject(left[k])
		? { ...acc, [k]: merge(left[k], v) }
		: { ...acc, [k]: v }),
	left)

const diff = (x = {}, y = {}) => merge(diff1(x, y, 'left'),
	diff1(y, x, 'right'))

module.exports = { diff }