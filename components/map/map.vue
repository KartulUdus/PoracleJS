<template>
    <div id="map">
        <no-ssr>
            <l-map :zoom=startZoom :center="{lat: startLat, lng : startLon}">
                <l-tile-layer :url=tileserver></l-tile-layer>
            </l-map>
        </no-ssr>
    </div>
</template>
<script>

</script>