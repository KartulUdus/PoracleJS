<template>
    <div id="map">
        <no-ssr>
            <l-map  ref="Lmap"
                    :zoom=startZoom
                    :center="{lat: startLat, lng : startLon}"
                    :min-zoom="5"
                    :max-zoom="15"
                    @update:bounds="loadMap"
            >

                <l-tile-layer :url=tileserver></l-tile-layer>

                <!-- Render array of Monster markers -->
                <l-marker v-for="p in pokemonMarkers" :key="p.encounter_id" :lat-lng="{lat: p.lat, lng : p.lon}" :icon="p.icon">
                    <l-popup v-if="p.raw.weight">
                        <div class="popupPoracle">
                            <img :src="p.link" width='65px'/>
                            <h3>{{p.humanWords.name}} <br> {{p.humanWords.typeString}}</h3>
                            <vac :end-time="convertUTCDateToLocalDate(new Date(p.raw.disappear_time))">
                             <span slot-scope="{ timeObj }">
                                 Disappear time: {{ (convertUTCDateToLocalDate(new Date(p.raw.disappear_time))).toLocaleTimeString() }} <br>
                                 {{ `Time til hidden: ${timeObj.m}:${timeObj.s}` }} <br>

                                 <a :href="p.mapLink">Google Maps</a> <br>
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
                            <vac :end-time="convertUTCDateToLocalDate(new Date(p.raw.disappear_time)).getTime()">
                             <span slot-scope="{ timeObj }">
                                 Disappear time: {{ (convertUTCDateToLocalDate(new Date(p.raw.disappear_time))).toLocaleTimeString() }} <br>
                                     {{ `Time til hidden: ${timeObj.m}:${timeObj.s}` }} <br>
                                 <a :href="p.mapLink">Google Maps</a> <br>

                             </span>
                            </vac>
                        </div>
                    </l-popup>
                </l-marker>
                <!-- Render array of Raid markers -->
                <l-marker v-for="r in raidMarkers" :key="r.key" :lat-lng="{lat: r.lat, lng : r.lon}" :icon="r.icon">
                    <l-popup>
                        <div class="raidGymPopup">
                            <img v-if="r.id" :src="r.pLink">
                            <img v-else :src="r.eLink">
                            <h4 v-if="r.id">Raid lvl {{ r.raw.raid_level }} {{r.humanWords.name}} <br> {{r.humanWords.typeString}}</h4>
                            <h4 v-else>Raid lvl {{ r.raw.raid_level }} {{r.humanWords.name}} <br> {{r.humanWords.typeString}}</h4>
                            <a :href="r.mapLink">Google Maps</a> <br>
                        </div>
                        <div v-if="convertUTCDateToLocalDate(new Date(r.start)) > new Date()" class="raidGymPopup">
                            <vac :end-time="convertUTCDateToLocalDate(new Date(r.start)).getTime()">
                              <span slot-scope="{ timeObj }" >
                                  Hatch time: {{ (convertUTCDateToLocalDate(new Date(r.start))).toLocaleTimeString() }} <br>
                                  {{ `Time til hatch: ${timeObj.m}:${timeObj.s}` }} <br>
                              </span>
                            </vac>
                        </div>
                        <div v-else class="raidGymPopup">
                            <vac :end-time="convertUTCDateToLocalDate(new Date(r.end)).getTime()">
                              <span slot-scope="{ timeObj }" >
                                  End time: {{ (convertUTCDateToLocalDate(new Date(r.end))).toLocaleTimeString() }} <br>
                                  {{ `Raid will end in: ${timeObj.m}:${timeObj.s}` }} <br>
                                  <div v-if="r.id"> Target 100% cp: {{ $getRiadTargetCp(r.id)["20"] }} / {{ $getRiadTargetCp(r.id)["25"] }}  <br>
                                    {{$getMoveData(r.raw.move_1)}} / {{$getMoveData(r.raw.move_2)}}
                                  </div>
                              </span>
                            </vac>
                        </div>
                    </l-popup>
                </l-marker>
                <!-- Render array of Gym markers -->
                <l-marker v-for="g in gymMarkers" :key="g.key" :lat-lng="{lat: g.lat, lng : g.lon}" :icon="g.icon">
                    <l-popup>
                        <div class="popupPoracle">
                            <img id="gymImg" v-if="g.url" :src="g.url">
                            <h3>{{g.name}}</h3>
                            <h4 v-if="g.ex">This gym is eligible for EX raids</h4>
                            <a :href="g.mapLink">Google Maps</a> <br>

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
                raidMarkers: [],
                gymMarkers: []
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
                        this.convertUTCDateToLocalDate(new Date(this.pokemonMarkers[i].disappear_time)) < new Date
                    ) {
						this.pokemonMarkers.splice(i, 1);
					}
				}
				for( let i = 0; i < this.raidMarkers.length-1; i++){
					if (this.raidMarkers[i].lat > bounds._northEast.lat ||
						this.raidMarkers[i].lat < bounds._southWest.lat ||
						this.raidMarkers[i].lon > bounds._northEast.lng ||
						this.raidMarkers[i].lon < bounds._southWest.lng ||
                        this.convertUTCDateToLocalDate(new Date(this.raidMarkers[i].end)) < new Date
					) {
						this.raidMarkers.splice(i, 1);
					}
				}
				for( let i = 0; i < this.gymMarkers.length-1; i++){
					if (this.gymMarkers[i].lat > bounds._northEast.lat ||
						this.gymMarkers[i].lat < bounds._southWest.lat ||
						this.gymMarkers[i].lon > bounds._northEast.lng ||
						this.gymMarkers[i].lon < bounds._southWest.lng
					) {
						this.gymMarkers.splice(i, 1);
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
                        mapLink: `https://www.google.com/maps/search/?api=1&query=${pokemon.latitude},${pokemon.longitude}`,
						humanWords: this.$getBasicMonsterData(pokemon.pokemon_id)
					}
                    // Add not existing Raid to markers
                    this.pokemonMarkers.pushIfNotExist(marker, function(e) {
						return e.lat === marker.lat && e.lon === marker.lon && e.encounter_id === marker.encounter_id;
					})

				})

                raw_data.data.raids.forEach((raid) => {
					let link = `static/raid/raid${raid.pokemon_id}level${raid.raid_level}t${raid.team}ex${raid.is_exclusive}.png`
					let marker = {
						id: raid.pokemon_id,
						gym_id: raid.gym_id,
						lat: raid.latitude,
						lon: raid.longitude,
						icon: this.createRaidIcon(link),
						link: link,
						start: raid.start,
                        end: raid.end,
						raw: raid,
						mapLink: `https://www.google.com/maps/search/?api=1&query=${raid.latitude},${raid.longitude}`,
						humanWords: this.$getBasicMonsterData(raid.pokemon_id),
                        pLink: this.getPokemonLink(raid),
                        eLink: `static/egg${raid.raid_level}.png`,
                        key: `${raid.gym_id}${raid.pokemon_id}${raid.end}${raid.team}${raid.is_exclusive}`
					}
					// First Try to update raid marker, then add not existing Raid to markers

					this.raidMarkers.map(obj => [marker].find(o => o.lat === obj.lat && o.lon === obj.lon && obj.pokemon_id === 0) || obj)
					this.raidMarkers.pushIfNotExist(marker, function(e) {
						return e.lat === marker.lat && e.lon === marker.lon && e.link === marker.link;
					})

				})

				raw_data.data.gyms.forEach((gym) => {
					let link = `static/raid/gym${gym.team}ex${gym.park}.png`
					let marker = {
						id: gym.gym_id,
						lat: gym.latitude,
						lon: gym.longitude,
                        ex: gym.park,
                        name: gym.gym_name,
                        url: gym.url,
						link: link,
						icon: this.createRaidIcon(link),
						mapLink: `https://www.google.com/maps/search/?api=1&query=${gym.latitude},${gym.longitude}`,
						key: `${gym.gym_id}${gym.latitude}${gym.longitude}${gym.team}${gym.sponsor_id}`
					}
					// First Try to update raid marker, then add not existing Raid to markers
                    let shouldAddGym = true
                    this.raidMarkers.forEach(r => {
                    	if (r.lat.toString().substring(0, 8) === marker.lat.toString().substring(0, 8) &&
                            r.lon.toString().substring(0, 8) === marker.lon.toString().substring(0, 8)){shouldAddGym = false}
                    })

                    if (shouldAddGym){
						this.gymMarkers.pushIfNotExist(marker, function(r) {
							return r.lat.toString().substring(0, 8) === marker.lat.toString().substring(0, 8) &&
								r.lon.toString().substring(0, 8) === marker.lon.toString().substring(0, 8);
						})
                    }


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
			createRaidIcon(link){
				return L.icon({
					iconUrl:      link,
					iconSize:     [50, 50],
					iconAnchor:   [0, 0],
					popupAnchor:  [20, 0]
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
