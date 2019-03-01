const potato = require('./potato3')
const _ = require('lodash')

const test =  require('./config/custom-environment-variables')


_.forEach(test, x => {
	if (typeof x === 'object'){
		_.forEach(x, y => {
			if (typeof y === 'object') {
				_.forEach(y, z => {
					console.log(z)
				})
			} else { console.log(y)}
		})
	} else { console.log(x)}

})
