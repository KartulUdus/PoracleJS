require('./src/util/generateData').update()
	.then(() => require('./src/util/koji').getKojiFences())
	.then(() => require('./src/app'))
