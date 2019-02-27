<template>
    <div>
        <no-ssr>
            <div class="topbuttons">
                <p class="title"> <img class="title" src="~/assets/starchy.svg" height="50" width="66" />PoracleJS Raid Stats</p>
                <button class="button" v-on:click="timeTarget = 300000; updateAll()">5m</button>
                <button class="button" v-on:click="timeTarget = 900000; updateAll()">15m</button>
                <button class="button" v-on:click="timeTarget = 1800000; updateAll()">30m</button>
                <button class="button" v-on:click="timeTarget = 3600000; updateAll()">1h</button>
                <button class="button" v-on:click="timeTarget = 10800000; updateAll()">3h</button>
                <button class="button" v-on:click="timeTarget = 32400000; updateAll()">9h</button>
                <button class="button" v-on:click="timeTarget = getMsFromMidnight(); updateAll()">Today</button>

                <div class="dropdown">

                    <button class="dropbtn">Order By</button>
                    <div class="dropdown-content">
                        <a v-on:click="filter = 'id'; updateAll()">ID</a>
                        <a v-on:click="filter = 'count'; updateAll()">Count</a>
                        <a v-on:click="filter = 'level'; updateAll()">Average IV</a>
                    </div>
                </div>
            </div>
             <tr  class="line-chart" >
                 <td>
                     <Doughnut :chartData="eggDoughnut" :options="{ maintainAspectRatio: false, title: { display: true, text: 'Eggs' }}" />
                 </td>
                 <td>
                     <Doughnut :chartData="raidLvlDoughnut" :options="{ maintainAspectRatio: false, title: { display: true, text: 'Raids by Lvl' } }" />
                 </td>
                 <td>
                     <Doughnut :chartData="raidMonDoughnut" :options="{ maintainAspectRatio: false, title: { display: true, text: 'Raids by boss' } }" />
                 </td>

             </tr>
            <lineChart class="line-chart" :chartData="teamLine" :options="{ responsive: true , maintainAspectRatio: false }" />

             <div v-if="eggs.length">
                 <h2 class="title">Egg messages</h2>
             </div>
             <div>
                 <table class="monsterTable">
                     <div class="monster" v-for="p in eggs"  >
                         <img :src="p.imgUrl"/><br>
                         <nobr>Level {{p.level}} Raid Eggs</nobr><br>
                         <nobr>Count: {{p.count}}</nobr><br>
                         <nobr>Precentage of total: {{p.precentage.toFixed(2)}}%</nobr>
                     </div>
                 </table>
             </div>
             <div v-if="raids.length">
                 <h2 class="title">Raid messages</h2>
             </div>
             <div>
                 <table class="monsterTable">
                     <div class="monster" v-for="p in raids"  >
                         <img :src="p.imgUrl"/><br>
                         <nobr>#{{p.id}}: {{p.name}} {{p.emoji}}</nobr><br>
                         <nobr>Count: {{p.count}}</nobr><br>
                         <nobr>Precentage of total: {{p.precentage.toFixed(2)}}%</nobr>
                     </div>
                 </table>
             </div>
         </no-ssr>
     </div>
 </template>

 <script>
     import Doughnut from '~/components/doughnutChart'
	 import lineChart from '~/components/lineChart'
     import moment from 'moment'

     export default {
         name: 'statistics',
         layout: 'stats',
         data() {
             return {
                 timeTarget: 300000,
                 filter: 'count'
             }
         },

         computed: {
             eggs () { return this.$store.state.raid.eggData },
             raids () { return this.$store.state.raid.raidData },
			 eggDoughnut () { return this.$store.state.raid.eggDoughnut },
			 raidLvlDoughnut () { return this.$store.state.raid.raidLvlDoughnut },
			 raidMonDoughnut () { return this.$store.state.raid.raidMonDoughnut },
			 teamLine () { return this.$store.state.raid.teamChart },

		 },
         components: {
             Doughnut,
			 lineChart
         },
         methods: {
             updateAll() {
                 this.$store.commit('raid/createData', { timeTarget: this.timeTarget, filter: this.filter })
             },
			 getMsFromMidnight() {
				 return new Date().valueOf() - moment().startOf('day').valueOf()
			 }
         },
         mounted: function(){
             this.updateAll()
             setInterval(this.updateAll, 30000)
         }
     }
 </script>
