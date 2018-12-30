
module.exports = {
	loading: {
		color: 'purple'
	},
    plugins: [
        { src: '~/plugins/menu', ssr: false },
        { src: '~/plugins/monsterData', ssr: false }

    ],
	modules: ['@nuxtjs/axios', 'nuxt-leaflet'],

	axios: {
      retry: { retries: 3 }
    },

	css: [
	    '@/assets/css/PoracleMap.css'
	],

	env: {
		tileServer: "http://{s}.tile.osm.org/{z}/{x}/{y}.png",
		startPos: "59.4372155, 24.7453688",
		startZoom: "13",
		minZoom: "11",
		maxZoom: "16"
	}
}