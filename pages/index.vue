<template>
    <div id="map">
        <no-ssr>
            <l-map  ref="Lmap"
                    :zoom=startZoom
                    :center="{lat: startLat, lng : startLon}"
                    :min-zoom="minZoom"
                    :max-zoom="maxZoom"
                    @update:bounds="loadMap"
            >

                <l-tile-layer :url=tileserver></l-tile-layer>
                <!-- Render array of Monster markers -->
                <l-marker v-for="p in pokemonMarkers" :key="p.encounter_id" :lat-lng="{lat: p.lat, lng : p.lon}" :icon="p.icon">
                    <l-popup>
                        <div class="popupPoracle">
                            <img :src="p.link" width='65px'/>
                            <h3>#{{p.raw.pokemon_id}}:{{p.humanWords.name}} <br> {{p.humanWords.typeString}}</h3>
                            <vac :end-time="convertUTCDateToLocalDate(new Date(p.raw.disappear_time))">
                             <span slot-scope="{ timeObj }">
                                 Disappear time: {{ (convertUTCDateToLocalDate(new Date(p.raw.disappear_time))).toLocaleTimeString() }} <br>
                                 {{ `Time til hidden: ${timeObj.m}:${timeObj.s}` }} <br>

                                 <a :href="p.mapLink">Google Maps</a> <br>
                                 <b v-if="p.raw.weight" >IV: {{ ((p.raw.atk + p.raw.def + p.raw.sta) / 0.45).toFixed(2) }}% level:{{p.raw.level}} {{p.raw.atk}}/{{p.raw.def}}/{{p.raw.sta}}  </b> <br>
                                 <a v-if="p.raw.weight" >{{ $getMoveData(p.raw.move_1) }} / {{ $getMoveData(p.raw.move_2) }}</a>
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

		data() {
			return {
				tileserver: process.env.tileServer,
                startLat: process.env.startPos.split(',')[0],
                startLon: process.env.startPos.split(',')[1],
                startZoom: parseInt(process.env.startZoom),
				minZoom: parseInt(process.env.minZoom),
                maxZoom: parseInt(process.env.maxZoom),
                icons: {},
                initLoad: true
			}
		},
        updated(){
            this.initMap()
        },
		computed: {
			pokemonFilters () {
				return this.$store.state.filters.pokemon
			},
            pokemonMarkers () {	return this.$store.state.markers.pokemonMarkers },
            raidMarkers () { return this.$store.state.markers.raidMarkers },
			gymMarkers () {	return this.$store.state.markers.gymMarkers	}
		},
        methods: {

			async loadMap (bounds){
				// first we remove all elements that are outside the viewport
				this.$store.commit('markers/clearBadMarkers', bounds)
                // then call for raw_data
				let raw_data = await axios.get(`/raw/${bounds._southWest.lat}/${bounds._northEast.lat}/${bounds._southWest.lng}/${bounds._northEast.lng}`)
                // deal with the raw_data and send to $store
				raw_data.data.pokemon.forEach((pokemon) => {
					pokemon.link = this.getPokemonLink(pokemon)
                    pokemon.icon = this.createMonsterIcon(pokemon.link, pokemon.pokemon_id)
                    pokemon.humanwords = this.$getBasicMonsterData(pokemon.pokemon_id)
					this.$store.commit('markers/addP', pokemon)
				})
                raw_data.data.raids.forEach((raid) => {
                    raid.link = `static/raid/raid${raid.pokemon_id}level${raid.raid_level}t${raid.team}ex${raid.is_exclusive}.png`
                    raid.humanWords= this.$getBasicMonsterData(raid.pokemon_id)
                    raid.pLink = this.getPokemonLink(raid)
					raid.icon = this.createRaidIcon(raid.link, `raid${raid.pokemon_id}level${raid.raid_level}t${raid.team}ex${raid.is_exclusive}`)
					this.$store.commit('markers/addR', raid)
				})
				raw_data.data.gyms.forEach((gym) => {
					gym.link = `static/raid/gym${gym.team}ex${gym.park}.png`
                    gym.icon = this.createRaidIcon(gym.link, `gym${gym.team}ex${gym.park}`)
					this.$store.commit('markers/addG', gym)
				})
			},
			getPokemonLink(rawPokemon){
				return `static/pokemon_icon_${rawPokemon.pokemon_id.toString().padStart(3, '0')}_00.png`
			},

			createMonsterIcon(link, key){
				 if (this.icons[key]){
				 	return this.icons[key]
                 }
                 else {
                 	let icon = L.icon({
						iconUrl:      link,
						iconSize:     [30, 30],
						iconAnchor:   [15, 30],
						popupAnchor:  [0 , -25]
					})
                     this.icons[key] = icon
                     return icon
                 }
            },
			createRaidIcon(link, key){
				if (this.icons[key]){
					return this.icons[key]
				}
				else {
					let icon = L.icon({
						iconUrl:      link,
						iconSize:     [50, 50],
						iconAnchor:   [25, 50],
						popupAnchor:  [0 , -45]
					})
					this.icons[key] = icon
					return icon
				}
			},

			convertUTCDateToLocalDate(date) {
				let newDate = new Date(date.getTime()+date.getTimezoneOffset()*60*1000);
				let offset = date.getTimezoneOffset() / 60;
				let hours = date.getHours();
				newDate.setHours(hours - offset);
				return newDate;
			},

            initMap(){
				if (this.initLoad) {
					this.loadMap(this.$refs.Lmap.mapObject.getBounds())

					this.initLoad = false
				}
            }
        }
	}
</script>
