const config = require('config')

module.exports = {
	loading: {
		color: 'orange',
	},
	modules: ['@nuxtjs/axios', 'nuxt-leaflet', 'nuxt-svg'],

	axios: {
		retry: { retries: 3 },
	},
	build: {
		quiet: true,
	},
	link: [
		{
			rel: '/favico.ico',
			type: 'image/x-icon',
			href: '~assets/starchy.ico',
		},
	],
	css: ['@/stats.css'],
	srcDir: 'src/statistics/',

	env: {
		baseUrl: `http://${config.general.host}:${config.general.port}/`,
	},
}