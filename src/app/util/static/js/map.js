var map = L.map('map').setView([59.6, 24.4 ], 13);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
}).addTo(map);

var LeafIcon = L.Icon.extend({
	options: {
		shadowUrl:   '/static/images/egg5.png',
		iconSize:     [38, 95],
		shadowSize:   [50, 64],
		iconAnchor:   [22, 94],
		shadowAnchor: [4, 62],
		popupAnchor:  [-3, -76]
	}
});

var greenIcon = new LeafIcon({iconUrl: '/static/images/egg5.png'}),
	redIcon = new LeafIcon({iconUrl: '/static/images/egg3.png'}),
	orangeIcon = new LeafIcon({iconUrl: '/static/images/egg5.png'});

L.marker([59.6, 24.4 ], {icon: greenIcon}).bindPopup("I am a green leaf.").addTo(map);
L.marker([51.495, -0.083], {icon: redIcon}).bindPopup("I am a red leaf.").addTo(map);
L.marker([51.49, -0.1], {icon: orangeIcon}).bindPopup("I am an orange leaf.").addTo(map);

map.getBounds()
map.on('moveend', function(move){
	console.log(map.getBounds(move))

})