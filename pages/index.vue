<template>
    <div id="map">
        <no-ssr>
            <l-map  ref="Lmap"
                    :zoom=startZoom
                    :center="{lat: startLat, lng : startLon}"
                    :min-zoom="13"
                    :max-zoom="15"
                    @update:bounds="loadMap"
            >

                <l-tile-layer :url=tileserver></l-tile-layer>

                // Marker array render

                <l-marker v-for="p in pokemonMarkers" :key="p.encounter_id" :lat-lng="{lat: p.lat, lng : p.lon}" :icon="p.icon">
                    <l-popup v-if="p.raw.weight" >
                        <div class="popupPoracle">
                            <img :src="p.link" width='65px'/>
                            <h3>{{p.humanWords.name}} <br> {{p.humanWords.typeString}}</h3>
                            <vac :end-time="new Date(p.disappear_time).getTime()">
                             <span slot-scope="{ timeObj }">
                                 Disappear time: {{ (convertUTCDateToLocalDate(new Date(p.raw.disappear_time))).toLocaleTimeString() }} <br>
                                 {{ `Time til hidden: ${timeObj.m}:${timeObj.s}` }} <br>
                                 <b>IV: {{ ((p.raw.atk + p.raw.def + p.raw.sta) / 0.45).toFixed(2) }}% level:{{p.raw.level}} {{p.raw.atk}}/{{p.raw.def}}/{{p.raw.sta}}  </b> <br>
                                 {{ $getMoveData(p.raw.move_1) }} / {{ $getMoveData(p.raw.move_2) }}
                             </span>
                            </vac>
                        </div>
                    </l-popup>
                    <l-popup v-else>
                        <div class="popupPoracle">
                            <img :src="p.link" width='65px'/>
                            <h3>{{p.humanWords.name}} <br> {{p.humanWords.typeString}}</h3>
                            <vac :end-time="new Date(p.disappear_time).getTime()">
                             <span

                                slot-scope="{ timeObj }">
                                 Disappear time: {{ (convertUTCDateToLocalDate(new Date(p.raw.disappear_time))).toLocaleTimeString() }} <br>
                                 {{ `Time til hidden: ${timeObj.m}:${timeObj.s}` }}
                             </span>
                            </vac>
                        </div>


                    </l-popup>
                </l-marker>
            </l-map>
        </no-ssr>
    </div>
</template>

<script>

	import axios from 'axios'
	let L = { icon(){} };
	if (process.browser) L = require('leaflet');

	export default {
		layout: 'map',

		data() {
			return {
				tileserver: process.env.tileServer,
                startLat: process.env.startPos.split(',')[0],
                startLon: process.env.startPos.split(',')[1],
                startZoom: parseInt(process.env.startZoom),
                monsterData: {},
                pokemonMarkers: [],
                icons: []
			}
		},
		updated() {
			this.loadMap(this.$refs.Lmap.mapObject.getBounds())
		},

        methods: {
			async loadMap (bounds){

				// first we remove all elements that are outside the viewport
				for( let i = 0; i < this.pokemonMarkers.length-1; i++){
					if (this.pokemonMarkers[i].lat > bounds._northEast.lat ||
						this.pokemonMarkers[i].lat < bounds._southWest.lat ||
						this.pokemonMarkers[i].lon > bounds._northEast.lng ||
						this.pokemonMarkers[i].lon < bounds._southWest.lng ||
                        new Date(this.pokemonMarkers[i].disappear_time) < new Date) {
						this.pokemonMarkers.splice(i, 1);
					}
				}

				let raw_data = await axios.get(`/raw/${bounds._southWest.lat}/${bounds._northEast.lat}/${bounds._southWest.lng}/${bounds._northEast.lng}`)
				// Code to compare if markers are already included
                Array.prototype.inArray = function(comparer) {for(var i=0; i < this.length; i++) {if(comparer(this[i]))return true}return false}
				Array.prototype.pushIfNotExist = function(element, comparer) {if (!this.inArray(comparer)){this.push(element)}}



				raw_data.data.pokemon.forEach((pokemon) => {

                    let link = this.getPokemonLink(pokemon)
					let marker = {
						encounter_id: pokemon.encounter_id,
						lat: pokemon.latitude,
						lon: pokemon.longitude,
						icon: this.createMonsterIcon(link),
                        link: link,
                        disappear_time: pokemon.disappear_time,
                        raw: pokemon,
						humanWords: this.$getBasicMonsterData(pokemon.pokemon_id)
					}
                    // Add not existing pokemon to markers
                    this.pokemonMarkers.pushIfNotExist(marker, function(e) {
						return e.lat === marker.lat && e.lon === marker.lon && e.encounter_id === marker.encounter_id;
					})

				})

			},
			getPokemonLink(rawPokemon){
				return `static/pokemon_icon_${rawPokemon.pokemon_id.toString().padStart(3, '0')}_00.png`
			},

			createMonsterIcon(link){
				return L.icon({
					iconUrl:      link,
					iconSize:     [30, 30],
					iconAnchor:   [0, 0],
					popupAnchor:  [10, 0]
				})
            },

			convertUTCDateToLocalDate(date) {
				var newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);
				var offset = date.getTimezoneOffset() / 60;
				var hours = date.getHours();
				newDate.setHours(hours - offset);
				return newDate;
			}

        }
	}
</script>
