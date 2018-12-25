
module.exports = {
	loading: {
		color: 'purple'
	},
    plugins: [{ src: '~/plugins/menu', ssr: false }],
	modules: ['nuxt-leaflet'],
	css: ['@/assets/css/PoracleMap.css'],

	env: {
		tileServer: "http://{s}.tile.osm.org/{z}/{x}/{y}.png",
		startPos: "59.4372155, 24.7453688",
		startZoom: "13"
	}
}