const pokemonGif = require('pokemon-gif')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const { S2 } = require('s2-geometry')
const Controller = require('./controller')
const { log } = require('../lib/logger')
require('moment-precise-range-plugin')

class Monster extends Controller {
	async monsterWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let pokemonQueryString = `(pokemon_id=${data.pokemon_id} or pokemon_id=0) and (form = 0 or form = ${data.form})`
		if (data.pvpEvoLookup) pokemonQueryString = `(pokemon_id=${data.pvp_pokemon_id} and (form = 0 or form = ${data.pvp_form}) and (great_league_ranking < 4096 or ultra_league_ranking < 4096 or great_league_ranking_min_cp > 0 or ultra_league_ranking_min_cp > 0))`
		let pvpQueryString = `great_league_ranking>=${data.bestGreatLeagueRank} and great_league_ranking_min_cp<=${data.bestGreatLeagueRankCP} and ultra_league_ranking>=${data.bestUltraLeagueRank} and ultra_league_ranking_min_cp<=${data.bestUltraLeagueRankCP}`
		if (data.pvpEvoLookup) pvpQueryString = `great_league_ranking>=${data.pvp_bestGreatLeagueRank} and great_league_ranking_min_cp<=${data.pvp_bestGreatLeagueRankCP} and ultra_league_ranking>=${data.pvp_bestUltraLeagueRank} and ultra_league_ranking_min_cp<=${data.pvp_bestUltraLeagueRankCP}`
		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking from monsters
		join humans on humans.id = monsters.id
		where humans.enabled = true and
		(${pokemonQueryString}) and
		min_iv<=${data.iv} and
		max_iv>=${data.iv} and
		min_cp<=${data.cp} and
		max_cp>=${data.cp} and
		(gender = ${data.gender} or gender = 0) and
		min_level<=${data.pokemon_level} and
		max_level>=${data.pokemon_level} and
		atk<=${data.individual_attack} and
		def<=${data.individual_defense} and
		sta<=${data.individual_stamina} and
		max_atk>=${data.individual_attack} and
		max_def>=${data.individual_defense} and
		max_sta>=${data.individual_stamina} and
		min_weight<=${data.weight} * 1000 and
		max_weight>=${data.weight} * 1000 and
		(${pvpQueryString})
		`

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
				and
				(
					(
						round(
							6371000
							* acos(cos( radians(${data.latitude}) )
							* cos( radians( humans.latitude ) )
							* cos( radians( humans.longitude ) - radians(${data.longitude}) )
							+ sin( radians(${data.latitude}) )
							* sin( radians( humans.latitude ) )
						)
					) < monsters.distance and monsters.distance != 0)
					or
					(
						monsters.distance = 0 and (${areastring})
					)
				)
				group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking
				`)
		} else {
			query = query.concat(`
					and ((monsters.distance = 0 and (${areastring})) or monsters.distance > 0)
					group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping, monsters.great_league_ranking, monsters.ultra_league_ranking
					`)
		}
		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => +res.distance === 0 || +res.distance > 0 && +res.distance > this.getDistance({
				lat: res.latitude,
				lon: res.longitude,
			}, { lat: data.latitude, lon: data.longitude }))
		}
		result = this.returnByDatabaseType(result)
		// remove any duplicates
		const alertIds = []
		result = result.filter((alert) => {
			if (!alertIds.includes(alert.id)) {
				alertIds.push(alert.id)
				return alert
			}
		})
		return result
	}

	async handle(obj) {
		let pregenerateTile = false
		const data = obj
		try {
			let hrstart = process.hrtime()

			moment.locale(this.config.locale.timeformat)
			const minTth = this.config.general.alertMinimumTime || 0

			switch (this.config.geocoding.staticProvider.toLowerCase()) {
				case 'poracle': {
					data.staticmap = `https://tiles.poracle.world/static/${this.config.geocoding.type}/${+data.latitude.toFixed(5)}/${+data.longitude.toFixed(5)}/${this.config.geocoding.zoom}/${this.config.geocoding.width}/${this.config.geocoding.height}/${this.config.geocoding.scale}/png`
					break
				}
				case 'tileservercache': {
					pregenerateTile = true
					break
				}
				case 'google': {
					data.staticmap = `https://maps.googleapis.com/maps/api/staticmap?center=${data.latitude},${data.longitude}&markers=color:red|${data.latitude},${data.longitude}&maptype=${this.config.geocoding.type}&zoom=${this.config.geocoding.zoom}&size=${this.config.geocoding.width}x${this.config.geocoding.height}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'osm': {
					data.staticmap = `https://www.mapquestapi.com/staticmap/v5/map?locations=${data.latitude},${data.longitude}&size=${this.config.geocoding.width},${this.config.geocoding.height}&defaultMarker=marker-md-3B5998-22407F&zoom=${this.config.geocoding.zoom}&key=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				case 'mapbox': {
					data.staticmap = `https://api.mapbox.com/styles/v1/mapbox/streets-v10/static/url-https%3A%2F%2Fi.imgur.com%2FMK4NUzI.png(${data.longitude},${data.latitude})/${data.longitude},${data.latitude},${this.config.geocoding.zoom},0,0/${this.config.geocoding.width}x${this.config.geocoding.height}?access_token=${this.config.geocoding.staticKey[~~(this.config.geocoding.staticKey.length * Math.random())]}`
					break
				}
				default: {
					data.staticmap = ''
				}
			}
			if (data.form === undefined || data.form === null) data.form = 0
			const monster = this.monsterData[`${data.pokemon_id}_${data.form}`] ? this.monsterData[`${data.pokemon_id}_${data.form}`] : this.monsterData[`${data.pokemon_id}_0`]

			if (!monster) {
				log.warn('Couldn\'t find monster in:', data)
				return
			}

			const weatherCellKey = S2.latLngToKey(data.latitude, data.longitude, 10)
			const weatherCellId = S2.keyToId(weatherCellKey)

			let wData = null
			let weather = null
			if (weatherCellId in this.weatherController.controllerData) {
				wData = this.weatherController.controllerData[weatherCellId]
				weather = wData.weather
			}

			const encountered = !(!(['string', 'number'].includes(typeof data.individual_attack) && (+data.individual_attack + 1))
				|| !(['string', 'number'].includes(typeof data.individual_defense) && (+data.individual_defense + 1))
				|| !(['string', 'number'].includes(typeof data.individual_stamina) && (+data.individual_stamina + 1)))

			data.iv = encountered ? ((data.individual_attack + data.individual_defense + data.individual_stamina) / 0.45).toFixed(2) : -1
			data.individual_attack = encountered ? data.individual_attack : 0
			data.individual_defense = encountered ? data.individual_defense : 0
			data.individual_stamina = encountered ? data.individual_stamina : 0
			data.cp = encountered ? data.cp : 0
			data.pokemon_level = encountered ? data.pokemon_level : 0
			data.move_1 = encountered ? data.move_1 : 0
			data.move_2 = encountered ? data.move_2 : 0
			data.weight = encountered ? data.weight.toFixed(1) : 0
			if (data.boosted_weather) data.weather = data.boosted_weather
			if (!data.weather) data.weather = 0
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.color = monster.types[0].color
			data.ivcolor = this.findIvColor(data.iv)
			data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true)
			data.distime = moment(data.disappear_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.gif = pokemonGif(Number(data.pokemon_id))
			data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.png`
			data.stickerUrl = `${this.config.general.stickerUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.webp`

			data.pvp_pokemon_id = data.pokemon_id
			data.pvp_form = data.form
			data.pvpEvolutionData = {}

			data.bestGreatLeagueRank = 4096
			data.bestGreatLeagueRankCP = 0
			if (data.pvp_rankings_great_league) {
				for (const stats of data.pvp_rankings_great_league) {
					if (stats.rank && stats.rank < data.bestGreatLeagueRank) {
						data.bestGreatLeagueRank = stats.rank
						data.bestGreatLeagueRankCP = stats.cp || 0
					} else if (stats.rank && stats.cp && stats.rank === data.bestGreatLeagueRank && stats.cp > data.bestGreatLeagueRankCP) {
						data.bestGreatLeagueRankCP = stats.cp
					}
					if (this.config.pvp.pvpEvolutionDirectTracking && stats.rank && stats.cp && stats.pokemon != data.pokemon_id && stats.rank <= this.config.pvp.pvpFilterMaxRank && stats.cp >= this.config.pvp.pvpFilterGreatMinCP) {
						if (data.pvpEvolutionData[stats.pokemon]) {
							data.pvpEvolutionData[stats.pokemon].greatLeague = {
								rank: stats.rank,
								percentage: stats.percentage,
								pokemon: stats.pokemon,
								form: stats.form,
								level: stats.level,
								cp: stats.cp,
							}
						} else {
							data.pvpEvolutionData[stats.pokemon] = {
								greatLeague: {
									rank: stats.rank,
									percentage: stats.percentage,
									pokemon: stats.pokemon,
									form: stats.form,
									level: stats.level,
									cp: stats.cp,
								},
							}
						}
					}
				}
			}

			data.bestUltraLeagueRank = 4096
			data.bestUltraLeagueRankCP = 0
			if (data.pvp_rankings_ultra_league) {
				for (const stats of data.pvp_rankings_ultra_league) {
					if (stats.rank && stats.rank < data.bestUltraLeagueRank) {
						data.bestUltraLeagueRank = stats.rank
						data.bestUltraLeagueRankCP = stats.cp || 0
					} else if (stats.rank && stats.cp && stats.rank === data.bestUltraLeagueRank && stats.cp > data.bestUltraLeagueRankCP) {
						data.bestUltraLeagueRankCP = stats.cp
					}
					if (this.config.pvp.pvpEvolutionDirectTracking && stats.rank && stats.cp && stats.pokemon != data.pokemon_id && stats.rank <= this.config.pvp.pvpFilterMaxRank && stats.cp >= this.config.pvp.pvpFilterUltraMinCP) {
						if (data.pvpEvolutionData[stats.pokemon]) {
							data.pvpEvolutionData[stats.pokemon].ultraLeague = {
								rank: stats.rank,
								percentage: stats.percentage,
								pokemon: stats.pokemon,
								form: stats.form,
								level: stats.level,
								cp: stats.cp,
							}
						} else {
							data.pvpEvolutionData[stats.pokemon] = {
								ultraLeague: {
									rank: stats.rank,
									percentage: stats.percentage,
									pokemon: stats.pokemon,
									form: stats.form,
									level: stats.level,
									cp: stats.cp,
								},
							}
						}
					}
				}
			}

			data.staticSprite = encodeURI(JSON.stringify([
				{
					url: data.imgUrl,
					height: this.config.geocoding.spriteHeight,
					width: this.config.geocoding.spriteWidth,
					x_offset: 0,
					y_offset: 0,
					latitude: +data.latitude,
					longitude: +data.longitude,
				},
			]))
			if (this.config.geocoding.staticProvider === 'poracle') {
				data.staticmap = `${data.staticmap}?markers=${data.staticSprite}`
			}
			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.debug(`${monster.name} already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matched = await this.pointInArea([data.latitude, data.longitude])

			data.pvpEvoLookup = 0
			const whoCares = await this.monsterWhoCares(data)

			if (this.config.pvp.pvpEvolutionDirectTracking) {
				const pvpEvoData = data
				if (Object.keys(data.pvpEvolutionData).length !== 0) {
					for (const [key, pvpMon] of Object.entries(data.pvpEvolutionData)) {
						pvpEvoData.pvp_pokemon_id = key
						pvpEvoData.pvp_form = pvpMon.greatLeague ? pvpMon.greatLeague.form : pvpMon.ultraLeague.form
						pvpEvoData.pvp_bestGreatLeagueRank = pvpMon.greatLeague ? pvpMon.greatLeague.rank : 4096
						pvpEvoData.pvp_bestGreatLeagueRankCP = pvpMon.greatLeague ? pvpMon.greatLeague.cp : 0
						pvpEvoData.pvp_bestUltraLeagueRank = pvpMon.ultraLeague ? pvpMon.ultraLeague.rank : 4096
						pvpEvoData.pvp_bestUltraLeagueRankCP = pvpMon.ultraLeague ? pvpMon.ultraLeague.cp : 0
						pvpEvoData.pvpEvoLookup = 1
						const pvpWhoCares = await this.monsterWhoCares(pvpEvoData)
						if (pvpWhoCares[0]) {
							whoCares.push(...pvpWhoCares)
						}
					}
				}
			}

			let hrend = process.hrtime(hrstart)
			const hrendms = hrend[1] / 1000000
			this.log.info(`${monster.name} appeared and ${whoCares.length} humans cared. (${hrendms} ms)`)

			if (!whoCares[0]) return []

			if (whoCares[0] && whoCares.length > 1 && this.config.pvp.pvpEvolutionDirectTracking) {
				const whoCaresNoDuplicates = whoCares.filter((v, i, a) => a.findIndex((t) => (t.id === v.id)) === i)
				whoCares.length = 0
				whoCares.push(...whoCaresNoDuplicates)
			}

			hrstart = process.hrtime()
			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				const { count } = this.getDiscordCache(cares.id)
				if (count <= this.config.discord.limitAmount + 1) discordCacheBad = false // but if anyone cares and has not exceeded cache, go on
			})

			if (discordCacheBad) return []
			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			if (pregenerateTile) {
				data.staticmap = await this.tileserverPregen.getPregeneratedTileURL('monster', data)
			}

			for (const cares of whoCares) {
				const caresCache = this.getDiscordCache(cares.id).count
				if (wData && wData.cares) {
					let exists = false
					for (const oc of wData.cares) {
						if (oc.id === cares.id) {
							exists = true
							break
						}
					}
					if (!exists) wData.cares.push(cares)
				} else if (wData) {
					wData.cares = []
					wData.cares.push(cares)
				}

				if (!this.weatherController.controllerData.caresUntil) {
					this.weatherController.controllerData.caresUntil = []
					this.weatherController.controllerData.caresUntil[cares.id] = data.disappear_time * 1000
				} else if (!(cares.id in this.weatherController.controllerData.caresUntil) || this.weatherController.controllerData.caresUntil[cares.id] < (data.disappear_time * 1000)) {
					this.weatherController.controllerData.caresUntil[cares.id] = data.disappear_time * 1000
				}

				const language = cares.language || this.config.general.locale
				const translator = this.translatorFactory.Translator(language)

				data.name = translator.translate(monster.name)
				data.formname = translator.translate(monster.form.name)
				data.quickMove = data.weight && this.utilData.moves[data.move_1] ? translator.translate(this.utilData.moves[data.move_1].name) : ''
				data.chargeMove = data.weight && this.utilData.moves[data.move_2] ? translator.translate(this.utilData.moves[data.move_2].name) : ''
				data.move1emoji = this.utilData.moves[data.move_1] && this.utilData.types[this.utilData.moves[data.move_1].type] ? translator.translate(this.utilData.types[this.utilData.moves[data.move_1].type].emoji) : ''
				data.move2emoji = this.utilData.moves[data.move_2] && this.utilData.types[this.utilData.moves[data.move_2].type] ? translator.translate(this.utilData.types[this.utilData.moves[data.move_2].type].emoji) : ''
				data.boost = this.utilData.weather[data.weather] ? this.utilData.weather[data.weather].name : ''
				data.boostemoji = this.utilData.weather[data.weather] ? translator.translate(this.utilData.weather[data.weather].emoji) : ''
				data.gameweather = this.utilData.weather[weather] ? this.utilData.weather[weather].name : ''
				data.gameweatheremoji = this.utilData.weather[weather] ? translator.translate(this.utilData.weather[weather].emoji) : ''
				const e = []
				monster.types.forEach((type) => {
					e.push(translator.translate(this.utilData.types[type.name].emoji))
				})
				data.emoji = e
				data.emojiString = e.join('')

				const view = {
					...geoResult,
					...data,
					id: data.pokemon_id,
					baseStats: monster.stats,
					time: data.distime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					name: data.name,
					now: new Date(),
					genderData: this.utilData.genders[data.gender],
					level: Math.round(data.pokemon_level),
					atk: data.individual_attack,
					def: data.individual_defense,
					sta: data.individual_stamina,
					imgUrl: data.imgUrl,
					greatleagueranking: cares.great_league_ranking === 4096 ? 0 : cares.great_league_ranking,
					ultraleagueranking: cares.ultra_league_ranking === 4096 ? 0 : cares.ultra_league_ranking,
					// pokemoji: emojiData.pokemon[data.pokemon_id],
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
					pvpDisplayMaxRank: this.config.pvp.pvpDisplayMaxRank,
					pvpDisplayGreatMinCP: this.config.pvp.pvpDisplayGreatMinCP,
					pvpDisplayUltraMinCP: this.config.pvp.pvpDisplayUltraMinCP,
				}

				let [platform] = cares.type.split(':')
				if (platform == 'webhook') platform = 'discord'

				const mustache = this.getDts((data.iv === -1) ? 'monsterNoIv' : 'monster', platform, cares.template, language)
				if (mustache) {
					const message = JSON.parse(mustache(view, { data: { language } }))

					if (cares.ping) {
						if (!message.content) {
							message.content = cares.ping
						} else {
							message.content += cares.ping
						}
					}

					const work = {
						lat: data.latitude.toString().substring(0, 8),
						lon: data.longitude.toString().substring(0, 8),
						message: caresCache === this.config.discord.limitAmount + 1 ? { content: `You have reached the limit of ${this.config.discord.limitAmount} messages over ${this.config.discord.limitSec} seconds` } : message,
						target: cares.id,
						type: cares.type,
						name: cares.name,
						tth: data.tth,
						clean: cares.clean,
						emoji: caresCache === this.config.discord.limitAmount + 1 ? [] : data.emoji,
					}
					if (caresCache <= this.config.discord.limitAmount + 1) {
						jobs.push(work)
						this.addDiscordCache(cares.id)
					}
				}
			}
			hrend = process.hrtime(hrstart)
			const hrendprocessing = hrend[1] / 1000000
			this.log.info(`${monster.name} appeared and ${whoCares.length} humans cared [end]. (${hrendms} ms sql ${hrendprocessing} ms processing dts)`)

			return jobs
		} catch (e) {
			this.log.error('Can\'t seem to handle monster: ', e, data)
		}
	}
}

module.exports = Monster
