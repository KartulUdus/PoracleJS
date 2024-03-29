const axios = require('axios')

class TileserverPregen {
	constructor(config, log) {
		this.axios = axios
		this.log = log
		this.config = config
	}

	getConfigForTileType(maptype) {
		const tileTemplate = maptype
		const configTemplate = maptype === 'monster' ? 'pokemon' : maptype

		const tileServerOptions = {}
		Object.assign(tileServerOptions, {
			type: 'staticMap',
			includeStops: false,
			width: 500,
			height: 250,
			zoom: 15,
			pregenerate: true,
		}, this.config.geocoding.tileserverSettings ? this.config.geocoding.tileserverSettings.default : null)

		if (this.config.geocoding.staticMapType && this.config.geocoding.staticMapType[configTemplate]) {
			Object.assign(tileServerOptions, {
				type: this.config.geocoding.staticMapType[configTemplate].startsWith('*') ? this.config.geocoding.staticMapType[configTemplate].substring(1) : this.config.geocoding.staticMapType[configTemplate],
				pregenerate: !this.config.geocoding.staticMapType[configTemplate].startsWith('*'),
			})
		}

		if (this.config.geocoding.tileserverSettings && this.config.geocoding.tileserverSettings[tileTemplate]) {
			Object.assign(tileServerOptions, this.config.geocoding.tileserverSettings[tileTemplate])
		}

		return tileServerOptions
	}

	async getPregeneratedTileURL(logReference, type, data, staticMapType) {
		let mapType = 'staticmap'
		let templateType = ''
		if (staticMapType.toLowerCase() === 'multistaticmap') {
			mapType = 'multistaticmap'
			templateType = 'multi-'
		}
		const url = `${this.config.geocoding.staticProviderURL}/${mapType}/poracle-${templateType}${type}?pregenerate=true&regeneratable=true`
		try {
			this.log.debug(`${logReference}: Pre-generating static map ${url}`)
			const hrstart = process.hrtime()

			const timeoutMs = this.config.tuning.tileserverTimeout || 10000
			const source = axios.CancelToken.source()
			const timeout = setTimeout(() => {
				source.cancel(`Timeout waiting for response - ${timeoutMs}ms`)
				// Timeout Logic
			}, timeoutMs)

			const result = await axios.post(url, data, { cancelToken: source.token })
			clearTimeout(timeout)
			if (result.status !== 200) {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Got ${result.status}. Error: ${result.data ? result.data.reason : '?'}.`)
				return null
			} if (typeof result.data !== 'string') {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. No id returned.`)
				return null
			}
			const hrend = process.hrtime(hrstart)
			const hrendms = hrend[1] / 1000000

			if (result.data.includes('<')) { // check for HTML error response
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Got invalid response from tileserver - ${result.data}`)
				return null
			}
			const tileResult = result.data.startsWith('http') ? result.data : new URL(`${mapType}/pregenerated/${result.data}`, this.config.geocoding.staticProviderURL).toString();
			(this.config.logger.timingStats ? this.log.verbose : this.log.debug)(`${logReference}: Tile generated ${tileResult} (${hrendms} ms)`)

			return tileResult
		} catch (error) {
			if (error.response) {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Got ${error.response.status}. Error: ${error.response.data ? error.response.data.reason : '?'}.`)
			} else {
				this.log.warn(`${logReference}: Failed to Pregenerate ${templateType}StaticMap. Error: ${error}.`)
			}
			return null
		}
	}

	async getTileURL(logReference, type, data, staticMapType) {
		let mapType = 'staticmap'
		let templateType = ''
		if (staticMapType.toLowerCase() === 'multistaticmap') {
			mapType = 'multistaticmap'
			templateType = 'multi-'
		}
		const url = new URL(`${mapType}/poracle-${templateType}${type}`, this.config.geocoding.staticProviderURL)
		Object.keys(data).forEach((item) => {
			url.searchParams.set(item, data[item])
		})

		return url.toString()
	}

	// Inspiration from https://github.com/ccev/stscpy/blob/main/tileserver/staticmap.py#L138

	/**
	 * work out zoom and lat/lon for best tile
	 * @param shapes
	 */
	// eslint-disable-next-line class-methods-use-this
	autoposition(shapes, width, height, margin = 1.25, defaultZoom = 17.5) {
		width /= margin
		height /= margin

		function adjustLatitude(lat, distance) {
			const earth = 6378.137 // radius of the earth in kilometer
			const pi = Math.PI
			const m = (1 / ((2 * pi / 360) * earth)) / 1000 // 1 meter in degree

			return lat + (distance * m)
		}

		function adjustLongitude(lat, lon, distance) {
			const earth = 6378.137 // radius of the earth in kilometer
			const pi = Math.PI
			const { cos } = Math
			const m = (1 / ((2 * pi / 360) * earth)) / 1000 // 1 meter in degree

			return lon + (distance * m) / cos(lat * (pi / 180))
		}

		const objs = []
		if (shapes.circles) {
			shapes.circles.forEach((c) => {
				objs.push([adjustLatitude(c.latitude, -c.radiusM), c.longitude])
				objs.push([adjustLatitude(c.latitude, c.radiusM), c.longitude])

				objs.push([c.latitude, adjustLongitude(c.latitude, c.longitude, -c.radiusM)])
				objs.push([c.latitude, adjustLongitude(c.latitude, c.longitude, c.radiusM)])
			})
		}
		if (shapes.markers) {
			objs.push(...shapes.markers.map((x) => [x.latitude, x.longitude]))
		}
		if (shapes.polygons) {
			shapes.polygons.forEach((p) => {
				objs.push(...p.path)
			})
		}

		if (!objs.length) return

		const lats = objs.map(([lat]) => lat)
		const lons = objs.map(([, lon]) => lon)

		const minLat = Math.min(...lats)
		const maxLat = Math.max(...lats)
		const minLon = Math.min(...lons)
		const maxLon = Math.max(...lons)

		const latitude = minLat + ((maxLat - minLat) / 2.0)
		const longitude = minLon + ((maxLon - minLon) / 2.0)

		const ne = [maxLat, maxLon]
		const sw = [minLat, minLon]

		if (ne === sw) {
			return {
				zoom: defaultZoom,
				latitude: lats[0],
				longitude: lons[0],
			}
		}

		function latRad(lat) {
			const sin = Math.sin(lat * Math.PI / 180.0)
			const rad = Math.log((1.0 + sin) / (1.0 - sin)) / 2.0
			return Math.max(Math.min(rad, Math.PI), -Math.PI) / 2.0
		}

		function roundToTwo(num) {
			return +(`${Math.round(`${num}e+2`)}e-2`)
		}

		function zoom(px, fraction) {
			return roundToTwo(Math.log2(px / 256.0 / fraction))
		}

		const latFraction = (latRad(ne[0]) - latRad(sw[0])) / Math.PI
		let angle = ne[1] - sw[1]
		if (angle < 0.0) angle += 360.0
		const lonFraction = angle / 360.0
		return {
			zoom: Math.min(zoom(height, latFraction), zoom(width, lonFraction)),
			latitude,
			longitude,
		}
	}

	// eslint-disable-next-line class-methods-use-this
	limits(latCenter, lonCenter, width, height, zoom) {
		// copied from https://help.openstreetmap.org/questions/75611/transform-xy-pixel-values-into-lat-and-long
		const C = (256 / (2 * Math.PI)) * 2 ** zoom

		const xcenter = C * (lonCenter * Math.PI / 180.0 + Math.PI)
		const ycenter = C * (Math.PI - Math.log(Math.tan((Math.PI / 4) + latCenter * Math.PI / 360.0)))

		const points = []
		for (const point of [[0, 0], [width, height]]) {
			const xpoint = xcenter - (width / 2 - point[0])
			const ypoint = ycenter - (height / 2 - point[1])

			const M = (xpoint / C) - Math.PI
			const N = -(ypoint / C) + Math.PI

			const finLon = M * 180.0 / Math.PI
			const finLat = (Math.atan(Math.E ** N) - (Math.PI / 4)) * 2 * 180.0 / Math.PI
			points.push([finLat, finLon])
		}
		return points
	}
}

module.exports = TileserverPregen
