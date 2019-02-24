<template>
    <div>
        <no-ssr>
            <div class="topbuttons">
                <p class="title"> <img class="title" src="~/assets/starchy.svg" height="50" width="66" />PoracleJS Logs</p>
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
                        <a v-on:click="filter = 'new'; updateAll()">Newest</a>
                        <a v-on:click="filter = 'old'; updateAll()">Oldest</a>
                    </div>
                </div>
            </div>
            <div class="topbuttons">
                <button class="button" v-on:click="logType = 'all'; updateAll()">All</button>
                <button class="button" v-on:click="logType = 'warn'; updateAll()">Warnings</button>
                <button class="button" v-on:click="logType = 'err'; updateAll()">Errors</button>

            </div>
                <div v-for="log in rawLogs">
                    <button
                            class="accordion"
                            v-on:click="toggleAccordion(log.timestamp); updateAll()"
                            v-bind:style="{backgroundColor: getLogColor(log.level)}"
                    >Level: {{log.level}}, Message: {{log.message}}, Timestamp: {{log.timestamp}}</button>
                    <div
                            class="panel"
                            v-if="accordionPanels[log.timestamp]"
                    >
                        <jsonView
                                :value="log"
                                :expand-depth=5
                                copyable
                                sort
                        >
                        </jsonView>
                    </div>
                </div>
            </Accordion>
        </no-ssr>
    </div>
</template>

<script>
	import moment from 'moment'
    import jsonView from '~/components/json'


	export default {
		name: 'statistics',
		layout: 'stats',
		data() {
			return {
				timeTarget: 300000,
                filter: 'old',
                accordionPanels: {},
                logType: 'all'
			}
		},

		components: {
			jsonView
		},

		computed: {
			rawLogs () { return this.$store.state.logs.rawLogs }
	    },

        watch: {
        },

		methods: {
			updateAll() {
				this.$store.commit('logs/createData', { timeTarget: this.timeTarget, filter: this.filter, logType: this.logType })
			},
			getMsFromMidnight() {
				return new Date().valueOf() - moment().startOf('day').valueOf()
			},
            toggleAccordion(key) {

				let field = this.accordionPanels[key]
				if(!field) {
					this.accordionPanels[key] = true;
				} else {
					this.accordionPanels[key] = false;
                }
            },
            getLogColor(level){
				if(level === 'warn') return '#ffb96d'
				if(level === 'error') return '#ff7160'
				if(level === 'info') return '#89a8ff'
				if(level === 'debug') return '#a2ffad'
                return '#a2ffad'
			},
			getLogHoverColor(level){
				if(level === 'warn') return '#ce945e'
				if(level === 'error') return '#cd5b4d'
				if(level === 'info') return '#6a82c5'
				if(level === 'debug') return '#71b279'
				return '#7dc586'
			}
		},
		mounted: function(){
			this.updateAll()
            setInterval(this.updateAll, 30000)
		}
	}
</script>
