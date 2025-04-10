const geoTz = require('geo-tz')
const moment = require('moment-timezone')
const Controller = require('./controller')

/**
 * Controller for processing fort update webhooks
 */
class FortUpdate extends Controller {
	async fortUpdateWhoCares(obj) {
		const data = obj
		const { areastring, strictareastring } = this.buildAreaString(data.matched)

		let changestring = '1 = 0 '
		data.changeTypes.forEach((change) => {
			changestring = changestring.concat(`or forts.change_types like '%"${change}"%' `)
		})

		let query = `
		select humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, forts.template, forts.distance, forts.ping from forts
		join humans on (humans.id = forts.id and humans.current_profile_no = forts.profile_no)
		where humans.enabled = 1 and humans.admin_disable = false and (humans.blocked_alerts IS NULL OR humans.blocked_alerts NOT LIKE '%forts%') and
		((forts.fort_type = 'everything' or forts.fort_type = '${data.fortType}') and (forts.change_types = '[]' or (${changestring}))
		${data.isEmpty ? 'and forts.include_empty = 1' : ''})
		${strictareastring}
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
					) < forts.distance and forts.distance != 0)
					or
					(
						forts.distance = 0 and (${areastring})
					)
			)
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
		} else {
			query = query.concat(`
				and ((forts.distance = 0 and (${areastring})) or forts.distance > 0)
			`)
			//			group by humans.id, humans.name, humans.type, humans.language, humans.latitude, humans.longitude, invasion.template, invasion.distance, invasion.clean, invasion.ping
		}
		// this.log.silly(`${data.pokestop_id}: Query ${query}`)

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
		// const minTth = this.config.general.alertMinimumTime || 0

		try {
			data.id = data.old?.id || data.new?.id
			const logReference = data.id

			data.longitude = data.new?.location?.lon || data.old?.location?.lon
			data.latitude = data.new?.location?.lat || data.old?.location?.lat

			data.fortType = data.new?.type || data.old?.type || 'unknown'
			Object.assign(data, this.config.general.dtsDictionary)
			data.googleMapUrl = `https://maps.google.com/maps?q=${data.latitude},${data.longitude}`
			data.appleMapUrl = `https://maps.apple.com/place?coordinate=${data.latitude},${data.longitude}`
			data.wazeMapUrl = `https://www.waze.com/ul?ll=${data.latitude},${data.longitude}&navigate=yes&zoom=17`
			if (this.config.general.rdmURL) {
				data.rdmUrl = `${this.config.general.rdmURL}${!this.config.general.rdmURL.endsWith('/') ? '/' : ''}@${data.latitude}/@${data.longitude}/18`
			}
			if (this.config.general.reactMapURL) {
				data.reactMapUrl = `${this.config.general.reactMapURL}${!this.config.general.reactMapURL.endsWith('/') ? '/' : ''}id/${data.fortType}s/${data.id}/18`
			}
			if (this.config.general.rocketMadURL) {
				data.rocketMadUrl = `${this.config.general.rocketMadURL}${!this.config.general.rocketMadURL.endsWith('/') ? '/' : ''}?lat=${data.latitude}&lon=${data.longitude}&zoom=18.0`
			}
			data.name = this.escapeJsonString(data.name)

			const expiration = data.reset_time + (7 * 24 * 60 * 60)
			data.tth = moment.preciseDiff(Date.now(), expiration * 1000, true)
			data.disappearDate = moment(expiration * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString()).format(this.config.locale.date)
			data.resetDate = moment(data.reset_time * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString()).format(this.config.locale.date)
			data.disappearTime = moment(expiration * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString()).format(this.config.locale.time)
			data.resetTime = moment(data.reset_time * 1000).tz(geoTz.find(data.latitude, data.longitude)[0].toString()).format(this.config.locale.time)

			data.applemap = data.appleMapUrl // deprecated
			data.mapurl = data.googleMapUrl // deprecated
			data.distime = data.disappearTime // deprecated

			data.matchedAreas = this.pointInArea([data.latitude, data.longitude])
			data.matched = data.matchedAreas.map((x) => x.name.toLowerCase())

			// If this is a change from an empty fort (eg after a GMO), treat it as 'new' in poracle
			if (data.change_type === 'edit' && !(data.old?.name || data.old?.description)) {
				data.change_type = 'new'
				data.edit_types = null
			}

			data.changeTypes = []
			if (data.edit_types) data.changeTypes.push(...data.edit_types)
			data.changeTypes.push(data.change_type)
			data.isEmpty = !(data.new?.name || data.new?.description || data.old?.name)

			// clean everything

			if (data.new) {
				if (data.new.name) data.new.name = this.escapeJsonString(data.new.name)
				if (data.new.description) data.new.description = this.escapeJsonString(data.new.description)
			}

			if (data.old) {
				if (data.old.name) data.old.name = this.escapeJsonString(data.old.name)
				if (data.old.description) data.old.description = this.escapeJsonString(data.old.description)
			}

			// helpers

			data.isEdit = data.change_type === 'edit'
			data.isNew = data.change_type === 'new'
			data.isRemoval = data.change_type === 'removal'

			data.isEditLocation = data.changeTypes.includes('location')
			data.isEditName = data.changeTypes.includes('name')
			data.isEditDescription = data.changeTypes.includes('description')
			data.isEditImageUrl = data.changeTypes.includes('image_url')
			data.isEditImgUrl = data.isEditImageUrl

			data.oldName = data.old?.name ?? ''
			data.oldDescription = data.old?.description ?? ''
			data.oldImageUrl = data.old?.image_url ?? ''
			data.oldImgUrl = data.oldImageUrl
			data.oldLatitude = data.old?.location?.lat || 0.0
			data.oldLongitude = data.old?.location?.lon || 0.0

			data.newName = data.new?.name ?? ''
			data.newDescription = data.new?.description ?? ''
			data.newImageUrl = data.new?.image_url ?? ''
			data.newImgUrl = data.newImageUrl
			data.newLatitude = data.new?.location?.lat || 0.0
			data.newLongitude = data.new?.location?.lon || 0.0

			data.fortTypeText = data.fortType === 'pokestop' ? 'Pokestop' : 'Gym'
			// eslint-disable-next-line default-case
			switch (data.change_type) {
				case 'edit':
					data.changeTypeText = 'Edit'
					break
				case 'removal':
					data.changeTypeText = 'Removal'
					break
				case 'new':
					data.changeTypeText = 'New'
					break
			}

			data.name = data.new?.name || data.old?.name || 'unknown'
			data.name = this.escapeJsonString(data.name)
			data.description = data.new?.description || data.old?.description || 'unknown'
			data.imgUrl = data.new?.image_url || data.old?.image_url || ''

			if (data.old) {
				data.old.imgUrl = data.old.image_url
				data.old.imageUrl = data.old.image_url
			}
			if (data.new) {
				data.new.imgUrl = data.new.image_url
				data.new.imageUrl = data.new.image_url
			}

			const whoCares = data.poracleTest ? [{
				...data.poracleTest,
				clean: false,
				ping: '',
			}] : await this.fortUpdateWhoCares(data)

			if (whoCares.length) {
				this.log.info(`${logReference}: Fort Update ${data.fortType} ${data.id} ${data.name} found in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			} else {
				this.log.verbose(`${logReference}: Fort Update ${data.fortType} ${data.id} ${data.name} found in areas (${data.matched}) and ${whoCares.length} humans cared.`)
			}

			let discordCacheBad = true // assume the worst
			whoCares.forEach((cares) => {
				if (!this.isRateLimited(cares.id)) discordCacheBad = false
			})

			if (discordCacheBad) {
				whoCares.forEach((cares) => {
					this.log.verbose(`${logReference}: Not creating fort update alert (Rate limit) for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)
				})

				return []
			}

			data.stickerUrl = data.imgUrl

			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			const jobs = []

			// Attempt to calculate best position for map
			const markers = []
			if (data.old?.location?.lat) {
				markers.push({ latitude: data.old.location.lat, longitude: data.old.location.lon })
			}
			if (data.new?.location?.lat) {
				markers.push({ latitude: data.new.location.lat, longitude: data.new.location.lon })
			}

			const position = this.tileserverPregen.autoposition({
				markers,
			}, 500, 250)
			data.zoom = Math.min(position.zoom, 16)
			data.map_longitude = position.longitude
			data.map_latitude = position.latitude

			await this.getStaticMapUrl(logReference, data, 'fort-update', ['map_latitude', 'map_longitude', 'longitude', 'latitude', 'zoom', 'imgUrl', 'isEditLocation', 'oldLatitude', 'oldLongitude', 'newLatitude', 'newLongitude'])
			data.staticmap = data.staticMap // deprecated

			for (const cares of whoCares) {
				this.log.debug(`${logReference}: Creating fort update alert for ${cares.id} ${cares.name} ${cares.type} ${cares.language} ${cares.template}`, cares)

				const rateLimitTtr = this.getRateLimitTimeToRelease(cares.id)
				if (rateLimitTtr) {
					this.log.verbose(`${logReference}: Not creating fort update (Rate limit) for ${cares.type} ${cares.id} ${cares.name} Time to release: ${rateLimitTtr}`)
					// eslint-disable-next-line no-continue
					continue
				}
				this.log.verbose(`${logReference}: Creating fort update alert for ${cares.type} ${cares.id} ${cares.name} ${cares.language} ${cares.template}`)

				const language = cares.language || this.config.general.locale
				//				const translator = this.translatorFactory.Translator(language)
				let [platform] = cares.type.split(':')
				if (platform === 'webhook') platform = 'discord'

				const now = new Date()
				const time = moment.tz(now, this.config.locale.time, geoTz.find(data.latitude, data.longitude)[0].toString())
				const view = {
					...geoResult,
					...data,
					tthd: data.tth.days,
					tthh: data.tth.hours,
					tthm: data.tth.minutes,
					tths: data.tth.seconds,
					time: time.format(this.config.locale.time),
					nowISO: now.toISOString(),
					areas: data.matchedAreas.filter((area) => area.displayInMatches).map((area) => area.name).join(', '),
				}

				const templateType = 'fort-update'
				const message = await this.createMessage(logReference, templateType, platform, cares.template, language, cares.ping, view)

				const work = {
					lat: data.latitude.toString().substring(0, 8),
					lon: data.longitude.toString().substring(0, 8),
					message,
					target: cares.id,
					type: cares.type,
					name: cares.name,
					tth: data.tth,
					clean: false,
					emoji: data.emoji,
					logReference,
					language,
				}

				jobs.push(work)
			}

			return jobs
		} catch (e) {
			this.log.error(`${data.pokestop_id}: Can't seem to handle fort update: `, e, data)
		}
	}
}

module.exports = FortUpdate
