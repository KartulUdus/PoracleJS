const pokemonGif = require('pokemon-gif')
const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')
const { log } = require('../lib/logger')

class Raid extends Controller {
	async raidWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping from raid
		join humans on humans.id = raid.id
		where humans.enabled = true and
		(pokemon_id=${data.pokemon_id} or (pokemon_id=9000 and raid.level=${data.level})) and
		(raid.team = ${data.team_id} or raid.team = 4) and
		(raid.exclusive = ${data.ex} or raid.exclusive = false) and
		(raid.form = ${data.form} or raid.form = 0) `

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			and
			(round( 6371000 * acos( cos( radians(${data.latitude}) )
				* cos( radians( humans.latitude ) )
				* cos( radians( humans.longitude ) - radians(${data.longitude}) )
				+ sin( radians(${data.latitude}) )
				* sin( radians( humans.latitude ) ) ) < raid.distance and raid.distance != 0) or
				raid.distance = 0 and (${areastring}))
				group by humans.id, humans.name, humans.type, humans.latitude, humans.longitude, raid.template, raid.distance, raid.clean, raid.ping
			`)
		} else {
			query = query.concat(`
				and (raid.distance = 0 and (${areastring}) or raid.distance > 0)
				group by humans.id, humans.name, raid.template
			`)
		}
		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => res.distance === 0 || res.distance > 0 && res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
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

	async eggWhoCares(data) {
		let areastring = `humans.area like '%"${data.matched[0] || 'doesntexist'}"%' `
		data.matched.forEach((area) => {
			areastring = areastring.concat(`or humans.area like '%"${area}"%' `)
		})
		let query = `
		select humans.id, humans.name, humans.type, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping from egg
		join humans on humans.id = egg.id
		where humans.enabled = true and
		egg.level = ${data.level} and
		(egg.team = ${data.team_id} or egg.team = 4) and
		(egg.exclusive = ${data.ex} or egg.exclusive = false) `

		if (['pg', 'mysql'].includes(this.config.database.client)) {
			query = query.concat(`
			and
			( 6371000 * acos( cos( radians(${data.latitude}) )
				* cos( radians( humans.latitude ) )
				* cos( radians( humans.longitude ) - radians(${data.longitude}) )
				+ sin( radians(${data.latitude}) )
				* sin( radians( humans.latitude ) ) ) < egg.distance and egg.distance != 0) or
				egg.distance = 0 and (${areastring})
				group by humans.id, humans.name, humans.type, humans.latitude, humans.longitude, egg.template, egg.distance, egg.clean, egg.ping
			`)
		} else {
			query = query.concat(`
				and (egg.distance = 0 and (${areastring}) or egg.distance > 0)
				group by humans.id, humans.name, egg.template
			`)
		}

		let result = await this.db.raw(query)

		if (!['pg', 'mysql'].includes(this.config.database.client)) {
			result = result.filter((res) => res.distance === 0 || res.distance > 0 && res.distance > this.getDistance({ lat: res.latitude, lon: res.longitude }, { lat: data.latitude, lon: data.longitude }))
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
		const minTth = this.config.general.alertMinimumTime || 0

		try {
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

			if (data.pokemon_id) {
				if (data.form === undefined || data.form === null) data.form = 0
				const monster = this.monsterData[`${data.pokemon_id}_${data.form}`] ? this.monsterData[`${data.pokemon_id}_${data.form}`] : this.monsterData[`${data.pokemon_id}_0`]
				if (!monster) {
					this.log.warn('Couldn\'t find monster in:', data)
					return
				}
				data.formname = monster.form.name
				data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
				data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
				data.tth = moment.preciseDiff(Date.now(), data.end * 1000, true)
				data.gif = pokemonGif(Number(data.pokemon_id))
				data.distime = moment(data.end * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
				if (!data.team_id) data.team_id = 0
				if (data.name) data.gymName = data.name ? data.name : ''
				data.name = this.translator.translate(monster.name)
				data.imgUrl = `${this.config.general.imgUrl}pokemon_icon_${data.pokemon_id.toString().padStart(3, '0')}_${data.form ? data.form.toString() : '00'}.png`
				const e = []
				monster.types.forEach((type) => {
					e.push(this.utilData.types[type.name].emoji)
				})
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
				data.emoji = e
				data.emojiString = e.join('')

				data.teamName = data.team_id ? this.utilData.teams[data.team_id].name : 'Harmony'
				data.color = data.team_id ? this.utilData.teams[data.team_id].color : 7915600

				data.quick_move = this.utilData.moves[data.move_1] ? this.translator.translate(this.utilData.moves[data.move_1].name) : ''
				data.charge_move = this.utilData.moves[data.move_2] ? this.translator.translate(this.utilData.moves[data.move_2].name) : ''
				data.move1emoji = this.utilData.moves[data.move_1] && this.utilData.moves[data.move_1].type ? this.utilData.types[this.utilData.moves[data.move_1].type].emoji : ''
				data.move2emoji = this.utilData.moves[data.move_2] && this.utilData.moves[data.move_2].type ? this.utilData.types[this.utilData.moves[data.move_2].type].emoji : ''
				data.ex = !!(data.ex_raid_eligible || data.is_ex_raid_eligible)
				if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
					log.warn(`Raid against ${data.name} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
					return []
				}

				data.matched = await this.pointInArea([data.latitude, data.longitude])
				const whoCares = await this.raidWhoCares(data)

				this.log.info(`Raid against ${data.name} appeared and ${whoCares.length} humans cared.`)

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
						now: new Date(),
						// gendername: emojiData.gender && emojiData.gender[data.gender] ? emojiData.gender[data.gender] : genderData[data.gender],
						move1: data.quick_move,
						move2: data.charge_move,
						move1emoji: data.move1emoji,
						move2emoji: data.move2emoji,
						imgUrl: data.imgUrl,
						// pokemoji: emojiData.pokemon[data.pokemon_id],
						areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
					}

					const raidDts = this.dts.find((template) => (template.type === 'raid' && template.id === cares.template && template.platform === 'discord') || (template.type === 'raid' && template.default && template.platform === 'discord'))

					const template = JSON.stringify(raidDts.template)
					const mustache = this.mustache.compile(template)
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
			}


			data.mapurl = `https://www.google.com/maps/search/?api=1&query=${data.latitude},${data.longitude}`
			data.applemap = `https://maps.apple.com/maps?daddr=${data.latitude},${data.longitude}`
			data.tth = moment.preciseDiff(Date.now(), data.start * 1000, true)
			data.hatchtime = moment(data.start * 1000).tz(geoTz(data.latitude, data.longitude).toString()).format(this.config.locale.time)
			data.imgUrl = `${this.config.general.imgUrl}egg${data.level}.png`
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
			if (!data.team_id) data.team_id = 0
			if (data.name) data.gymName = data.name
			data.teamname = data.team_id ? this.utilData.teams[data.team_id].name : 'Harmony'
			data.color = data.team_id ? this.utilData.teams[data.team_id].color : 7915600
			data.ex = !!(data.ex_raid_eligible || data.is_ex_raid_eligible)
			if (data.tth.firstDateWasLater || ((data.tth.hours * 3600) + (data.tth.minutes * 60) + data.tth.seconds) < minTth) {
				log.warn(`Raid against ${data.name} already disappeared or is about to expire in: ${data.tth.hours}:${data.tth.minutes}:${data.tth.seconds}`)
				return []
			}

			data.matched = await this.pointInArea([data.latitude, data.longitude])
			const whoCares = await this.eggWhoCares(data)
			this.log.info(`Raid egg level ${data.level} appeared and ${whoCares.length} humans cared.`)

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
					time: data.hatchtime,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					confirmedTime: data.disappear_time_verified,
					now: new Date(),
					// gendername: emojiData.gender && emojiData.gender[data.gender] ? emojiData.gender[data.gender] : genderData[data.gender],
					move1: data.quick_move,
					move2: data.charge_move,
					move1emoji: data.move1emoji,
					move2emoji: data.move2emoji,
					imgUrl: data.imgUrl,
					// pokemoji: emojiData.pokemon[data.pokemon_id],
					areas: data.matched.map((area) => area.replace(/'/gi, '').replace(/ /gi, '-')).join(', '),
				}

				const eggDts = this.dts.find((template) => (template.type === 'egg' && template.id === cares.template && template.platform === 'discord') || (template.type === 'egg' && template.default && template.platform === 'discord'))

				const template = JSON.stringify(eggDts.template)
				const mustache = this.mustache.compile(template)
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
				return jobs
			}
		} catch (e) {
			this.log.error('Can\'t seem to handle raid: ', e, data)
		}
	}
}


module.exports = Raid
