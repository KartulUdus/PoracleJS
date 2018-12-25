<template>
    <div id="map">
        <l-map :zoom=startZoom :center="{lat: startLat, lng : startLon}">
            <l-tile-layer :url=tileserver></l-tile-layer>
        </l-map>
    </div>
</template>

<script>
	export default {
		layout: 'map',
		data() {
			return {
				tileserver: process.env.tileServer,
                startLat: process.env.startPos.split(',')[0],
                startLon: process.env.startPos.split(',')[1],
                startZoom: parseInt(process.env.startZoom)
			}
		}
	}
</script>