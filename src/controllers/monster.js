const pokemonGif = require('pokemon-gif')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')
const { log } = require('../lib/logger')

require('moment-precise-range-plugin')


class Monster extends Controller {
	async monsterWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping from monsters
		join humans on humans.id = monsters.id
		where humans.enabled = true and
		pokemon_id=${data.pokemon_id} and
		min_iv<=${data.iv} and
		max_iv>=${data.iv} and
		min_cp<=${data.cp} and
		max_cp>=${data.cp} and
		(gender = ${data.gender} or gender = 0) and
		(form = ${data.form} or form = 0) and
		min_level<=${data.pokemon_level} and
		max_level>=${data.pokemon_level} and
		atk<=${data.individual_attack} and
		def<=${data.individual_defense} and
		sta<=${data.individual_stamina} and
		max_atk>=${data.individual_attack} and
		max_def>=${data.individual_defense} and
		max_sta>=${data.individual_stamina} and
		min_weight<=${data.weight} * 1000 and
		max_weight>=${data.weight} * 1000 `

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			and
			(round (6371000 * acos( cos( radians(${data.latitude}) )
			  * cos( radians( humans.latitude ) )
			  * cos( radians( humans.longitude ) - radians(${data.longitude}) )
			  + sin( radians(${data.latitude}) )
			  * sin( radians( humans.latitude ) ) ) < monsters.distance and monsters.distance != 0) or
			   monsters.distance = 0 and (${areastring}))
			   group by humans.id, humans.name, humans.type, humans.latitude, humans.longitude, monsters.template, monsters.distance, monsters.clean, monsters.ping
			`)
		} else {
			query = query.concat(`
				and (monsters.distance = 0 and (${areastring}) or monsters.distance > 0)
				group by humans.id, humans.name, monsters.template 
			`)
		}
		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => res.distance === 0 || +res.distance > 0 && +res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
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
		const data = obj
		try {
			moment.locale(this.config.locale.timeformat)
			const minTth = this.config.general.alertMinimumTime || 0

			switch (this.config.geocoding.staticProvider.toLowerCase()) {
				case 'poracle': {
					data.staticmap = `https://tiles.poracle.world/static/${this.config.geocoding.type}/${+data.latitude.toFixed(5)}/${+data.longitude.toFixed(5)}/${this.config.geocoding.zoom}/${this.config.geocoding.width}/${this.config.geocoding.height}/${this.config.geocoding.scale}/png`
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

			const encountered = !(!(['string', 'number'].includes(typeof data.individual_attack) && (+data.individual_attack + 1))
			|| !(['string', 'number'].includes(typeof data.individual_defense) && (+data.individual_defense + 1))
			|| !(['string', 'number'].includes(typeof data.individual_stamina) && (+data.individual_stamina + 1)))

			data.name = this.translator.translate(monster.name)
			data.formname = monster.form.name
			data.iv = encountered ? ((data.individual_attack + data.individual_defense + data.individual_stamina) / 0.45).toFixed(2) : -1
			data.individual_attack = encountered ? data.individual_attack : 0
			data.individual_defense = encountered ? data.individual_defense : 0
			data.individual_stamina = encountered ? data.individual_stamina : 0
			data.cp = encountered ? data.cp : 0
			data.pokemon_level = encountered ? data.pokemon_level : 0
			data.move_1 = encountered ? data.move_1 : 0
			data.move_2 = encountered ? data.move_2 : 0
			data.weight = encountered ? data.weight.toFixed(1) : 0
			data.quickMove = data.weight && this.utilData.moves[data.move_1] ? this.translator.translate(this.utilData.moves[data.move_1].name) : ''
			data.chargeMove = data.weight && this.utilData.moves[data.move_2] ? this.translator.translate(this.utilData.moves[data.move_2].name) : ''
			if (!data.weather) data.weather = 0
			data.move1emoji = this.utilData.moves[data.move_1] && this.utilData.types[this.utilData.moves[data.move_1].type] ? this.utilData.types[this.utilData.moves[data.move_1].type].emoji : ''
			data.move2emoji = this.utilData.moves[data.move_2] && this.utilData.types[this.utilData.moves[data.move_2].type] ? this.utilData.types[this.utilData.moves[data.move_2].type].emoji : ''
			data.boost = this.utilData.weather[data.weather] ? this.utilData.weather[data.weather].name : ''
			data.boostemoji = this.utilData.weather[data.weather] ? this.utilData.weather[data.weather].emoji : ''
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.color = monster.types[0].color
			data.ivcolor = this.findIvColor(data.iv)
			data.tth = moment.preciseDiff(Date.now(), data.disappear_time * 1000, true)
			data.distime = moment(data.disappear_time * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.gif = pokemonGif(Number(data.pokemon_id))
			data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.png`
			const e = []
			monster.types.forEach((type) => {
				e.push(this.utilData.types[type.name].emoji)
			})
			data.emoji = e
			data.emojiString = e.join('')

			data.staticSprite = encodeURI(JSON.stringify([
				{
					url: data.imgUrl,
					height: this.config.geocoding.spriteHeight,
					width: this.config.geocoding.spriteWidth,
					x_offset: 0,
					y_offset: 0,
					latitude: +data.latitude.toFixed(5),
					longitude: +data.longitude.toFixed(5),
				},
			]))
			if (this.config.geocoding.staticProvider === 'poracle') {
				data.staticmap = `${data.staticmap}?markers=${data.staticSprite}`
			}
			// Stop handling if it already disappeared or is about to go away
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.warn(`${data.name} already disappeared or is about to go away in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matched = await this.pointInArea([data.latitude, data.longitude])

			const whoCares = await this.monsterWhoCares(data)

			this.log.info(`${data.name} appeared and ${whoCares.length} humans cared.`)

			if (!whoCares[0]) return []

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				const { count } = this.getDiscordCache(cares.id)
				if (count <= this.config.discord.limitAmount + 1) discordCacheBad = false // but if anyone cares and has not exceeded cache, go on
			})

			if (discordCacheBad) return []
			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })

			const jobs = []
			for (const cares of whoCares) {
				const caresCache = this.getDiscordCache(cares.id).count

				const view = {
					...data,
					...geoResult,
					id: data.pokemon_id,
					baseStats: monster.baseStats,
					time: data.distime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					name: data.name,
					now: new Date(),
					// gendername: emojiData.gender && emojiData.gender[data.gender] ? emojiData.gender[data.gender] : genderData[data.gender],
					move1: data.quick_move,
					move2: data.charge_move,
					move1emoji: data.move1emoji,
					move2emoji: data.move2emoji,
					level: Math.round(data.pokemon_level),
					atk: data.individual_attack,
					def: data.individual_defense,
					sta: data.individual_stamina,
					imgUrl: data.imgUrl,
					// pokemoji: emojiData.pokemon[data.pokemon_id],
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}

				const monsterDts = data.iv === -1
					? this.dts.find((template) => (template.type === 'monsterNoIv' && template.id === cares.template && template.platform === 'discord') || (template.type === 'monsterNoIv' && template.default && template.platform === 'discord'))
					: this.dts.find((template) => (template.type === 'monster' && template.id === cares.template && template.platform === 'discord') || (template.type === 'monster' && template.default && template.platform === 'discord'))

				const template = JSON.stringify(monsterDts.template)
				const mustache = this.mustache.compile(this.translator.translate(template))
				const message = JSON.parse(mustache(view))

				if (cares.ping) {
					if (!message.content) message.content = cares.ping
					if (message.content) message.content += cares.ping
				}
				const work = {
					lat: data.latitude.toString().substring(0, 8),
					lon: data.longitude.toString().substring(0, 8),
					// sticker: data.sticker.toLowerCase(),
					message: caresCache === this.config.discord.limitAmount + 1 ? { content: `You have reached the limit of ${this.config.discord.limitAmount} messages over ${this.config.discord.limitSec} seconds` } : message,
					target: cares.id,
					type: cares.type,
					name: cares.name,
					tth: data.tth,
					clean: cares.clean,
					emoji: caresCache === this.config.discord.limitAmount + 1 ? [] : data.emoji,
					// meta: { correlationId: data.correlationId, messageId: data.messageId, alarmId },
				}
				if (caresCache <= this.config.discord.limitAmount + 1) {
					jobs.push(work)
					this.addDiscordCache(cares.id)
				}
			}
			return jobs
		} catch (e) {
			this.log.error('Can\'t seem to handle monster: ', e, data)
		}
	}
}

module.exports = Monster
