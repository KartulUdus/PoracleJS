const moment = require('moment-timezone')
const Controller = require('./controller')

require('moment-precise-range-plugin')

class Weather extends Controller {
	async handle(obj) {
		const data = obj
		try {
			moment.locale(this.config.locale.timeformat)

			let oldWeather = -1
			let whoCares = []
			if (data.s2_cell_id in this.controllerData) {
				const cellWeather = this.controllerData[data.s2_cell_id]
				oldWeather = cellWeather.weather
				if ('cares' in cellWeather) {
					whoCares = cellWeather.cares
				}
			}

			const newWeather = data.condition || cellWeather.gameplay_condition

			this.controllerData[data.s2_cell_id] = {
				time: data.time_changed || data.updated,
				weather: newWeather,
				cares: whoCares,
			}

			if (!this.config.general.weatherChangeAlert) {
				this.log.debug('weather change alerts are disabled, nobody cares.')
				this.controllerData[data.s2_cell_id].cares = []
				return []
			}

			if (oldWeather === newWeather || whoCares.length === 0) {
				this.log.debug(`weather was unchanged in ${data.s2_cell_id} or nobody cares.`)
				return []
			}

			this.controllerData[data.s2_cell_id].cares = []



			this.log.info(`weather has changed to ${newWeather} in ${data.s2_cell_id} and someone might care`)
			const geoResult = await this.getAddress({ lat: data.latitude, lon: data.longitude })
			if (oldWeather > -1) {
				data.oldweather = this.utilData.weather[oldWeather] ? this.translator.translate(this.utilData.weather[oldWeather].name) : ''
				data.oldweatheremoji = this.utilData.weather[oldWeather] ? this.translator.translate(this.utilData.weather[oldWeather].emoji) : ''
			} else {
				data.oldweather = ''
				data.oldweatheremoji = ''
			}
			data.weather = this.utilData.weather[newWeather] ? this.translator.translate(this.utilData.weather[newWeather].name) : ''
			data.weatheremoji = this.utilData.weather[newWeather] ? this.translator.translate(this.utilData.weather[newWeather].emoji) : ''

			const jobs = []
			const now = moment.now()
			const weatherTth = moment.preciseDiff(now, moment().add(1, 'hours'), true)

			for (const cares of whoCares) {
				if (cares.id in this.controllerData.caresUntil) {
					const careUntil = moment.this.controllerData.caresUntil[cares.id]
					if (careUntil < now) {
						this.log.debug(`weather changed in ${data.s2_cell_id} after mon despawn`)
						delete this.controllerData.caresUntil[cares.id]
						// eslint-disable-next-line no-continue
						continue
					}
				}

				const view = {
					...data,
					...geoResult,
					id: data.s2_cell_id,
					now: new Date(),
				}
				const weatherDts = this.dts.find((template) => template.type === 'weatherchange' && template.platform === 'discord')
				const template = JSON.stringify(weatherDts.template)
				const mustache = this.mustache.compile(this.translator.translate(template))
				const message = JSON.parse(mustache(view))

				const work = {
					lat: data.latitude.toString().substring(0, 8),
					lon: data.longitude.toString().substring(0, 8),
					message,
					target: cares.id,
					type: cares.type,
					name: cares.name,
					tth: weatherTth,
					clean: cares.clean,
					emoji: [],
				}
				jobs.push(work)
				this.addDiscordCache(cares.id)
			}
			return jobs
		} catch (e) {
			this.log.error('Can\'t seem to handle weather: ', e, data)
		}
	}
}

module.exports = Weather
